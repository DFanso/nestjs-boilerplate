FROM node:22-alpine AS deps
WORKDIR /app

# Install Bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Copy Prisma files for client generation
COPY prisma ./prisma
COPY prisma.config.ts ./

# Set dummy DATABASE_URL for Prisma client generation
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Install ALL dependencies (including dev) for build stage
RUN bun install --frozen-lockfile

# Generate Prisma client after installation
RUN bunx prisma generate

# Production dependencies stage - install only production dependencies
FROM node:22-alpine AS prod-deps
WORKDIR /app

# Install Bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Copy Prisma files for client generation
COPY prisma ./prisma
COPY prisma.config.ts ./

# Set dummy DATABASE_URL for Prisma client generation
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Install ONLY production dependencies
RUN bun install --frozen-lockfile --production

# Generate Prisma client for production
RUN bunx prisma generate

FROM node:22-alpine AS builder
WORKDIR /app

# Install Bun
RUN npm install -g bun

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy dependencies from deps stage (includes generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code, Prisma schema, and config
COPY . .

# Generate JWT keys
RUN mkdir -p keys && \
  openssl ecparam -name prime256v1 -genkey -noout -out keys/private.pem && \
  openssl ec -in keys/private.pem -pubout -out keys/public.pem && \
  chmod 600 keys/private.pem && \
  chmod 644 keys/public.pem

# Build the application
# Cache buster: Bun package manager migration - 2026-01-31
RUN bun run build

# Verify dist folder was created
RUN ls -la dist/ && echo "Build successful - dist/src contains:" && ls -la dist/src/ | head -20

FROM node:22-alpine AS runner
WORKDIR /app

# Install only runtime dependencies (no Bun needed in production)
RUN apk add --no-cache openssl dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nodejs

# Set environment
ENV NODE_ENV=production

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
# Copy ONLY production node_modules (smaller)
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Copy JWT keys generated in builder stage
COPY --from=builder --chown=nodejs:nodejs /app/keys ./keys

# Copy entrypoint script
COPY --chown=nodejs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

# Use entrypoint for migrations, seeding, and app startup
ENTRYPOINT ["./entrypoint.sh"]
