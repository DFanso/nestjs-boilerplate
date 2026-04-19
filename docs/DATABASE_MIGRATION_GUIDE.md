# Database Migration Guide

This guide covers database operations, migrations, and schema management for the NestJS boilerplate project using Prisma ORM with Supabase PostgreSQL.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Schema Management](#database-schema-management)
- [Migration Commands](#migration-commands)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Prerequisites

- Node.js and Bun installed
- Supabase project set up
- Environment variables configured
- Prisma CLI installed (`bunx prisma` or global installation)
- `tsx` (declared as a dependency) — runs the TypeScript seed (`prisma/seed.ts`) when you run `bunx prisma db seed` or the Docker entrypoint

## Environment Setup

### 1. Environment Variables

Create a `.env` file in your project root:

```env
# Supabase Database (Pooled connection for app)
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Supabase Database (Direct connection for migrations)
DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[region].aws.supabase.co:5432/postgres"

# JWT Configuration
JWT_PRIVATE_KEY_PATH="./keys/private.pem"
JWT_PUBLIC_KEY_PATH="./keys/public.pem"

# Other environment variables
NODE_ENV=development
PORT=9000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 2. Prisma Schema Configuration

Your `prisma/schema.prisma` should be configured for Supabase:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // Optional: for migrations
}
```

## Database Schema Management

### Current Schema Structure

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  password  String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  roles     UserRole[]
}

model UserRole {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id])
  userId String
  role   Role
}

enum Role {
  USER
  ADMIN
}
```

## Migration Commands

### Development Workflow

#### 1. Create and Apply Migration
```bash
# Create a new migration and apply it to the database
bunx prisma migrate dev --name <migration_name>

# Example: Adding a new field
bunx prisma migrate dev --name add_user_avatar
```

#### 2. Generate Prisma Client
```bash
# Generate TypeScript client after schema changes
bunx prisma generate
```

#### 3. Reset Database (Development Only)
```bash
# Reset database and apply all migrations
bunx prisma migrate reset
```

#### 4. Check Migration Status
```bash
# Check which migrations have been applied
bunx prisma migrate status
```

### Production Workflow

#### 1. Deploy Migrations
```bash
# Apply pending migrations to production database
bunx prisma migrate deploy
```

#### 2. Database Push (Alternative for prototyping)
```bash
# Push schema changes directly without creating migration files
# Use only in development for rapid prototyping
bunx prisma db push
```

### Database Inspection

#### 1. View Database in Prisma Studio
```bash
# Open Prisma Studio to view and edit data
bunx prisma studio
```

#### 2. Introspect Existing Database
```bash
# Generate Prisma schema from existing database
bunx prisma db pull
```

## Common Workflows

### 1. Adding a New Model

1. **Update Schema**: Add new model to `prisma/schema.prisma`
```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Update User model to include posts
model User {
  // ... existing fields
  posts     Post[]
}
```

2. **Create Migration**:
```bash
bunx prisma migrate dev --name add_post_model
```

3. **Generate Client**:
```bash
bunx prisma generate
```

### 2. Modifying Existing Fields

1. **Update Schema**: Modify field in `prisma/schema.prisma`
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String?  @unique  // Added new field
  password  String
  // ... rest of fields
}
```

2. **Create Migration**:
```bash
bunx prisma migrate dev --name add_username_field
```

### 3. Data Seeding

The project ships with `prisma/seed.ts`, which creates an **idempotent** admin user (hashed password via `bcrypt`, `ADMIN` role). Credentials come from optional env vars: `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (see `.env.example`).

Core pattern (simplified):

```typescript
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      username,
      password: passwordHash,
      roles: { create: { role: Role.ADMIN } },
    },
  });

  const hasAdmin = await prisma.userRole.findFirst({
    where: { userId: user.id, role: Role.ADMIN },
  });
  if (!hasAdmin) {
    await prisma.userRole.create({
      data: { userId: user.id, role: Role.ADMIN },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Configure the seed command in **`prisma.config.ts`** (Prisma 7+), not `package.json`:

```typescript
migrations: {
  path: 'prisma/migrations',
  seed: 'tsx prisma/seed.ts',
},
```

Run seed explicitly:

```bash
bunx prisma db seed
```

**Prisma 7:** `prisma db seed` is **not** run automatically by `prisma migrate dev` or `prisma migrate reset`; call it yourself when you need seed data (the Docker `entrypoint.sh` runs it after `prisma migrate deploy`).

## Troubleshooting

### Common Issues

#### 1. Migration Conflicts
```bash
# If migrations are out of sync
bunx prisma migrate resolve --applied <migration_name>
```

#### 2. Database Connection Issues
- Check if Supabase database is running
- Verify connection strings in `.env`
- Ensure database credentials are correct

#### 3. Schema Drift
```bash
# Check if database schema differs from Prisma schema
bunx prisma db push --preview-feature
```

#### 4. Prisma Client Issues
```bash
# Regenerate Prisma client
rm -rf generated/prisma
bunx prisma generate
```

#### 5. Hot Reload Issues (Development)
If you encounter "too many database connections" during development:

```typescript
// src/prisma/prisma.service.ts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    if (globalForPrisma.prisma) {
      return globalForPrisma.prisma as PrismaService;
    }
    
    super();
    
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = this;
    }
  }
}
```

### Emergency Recovery

#### 1. Backup Database
```bash
# Create backup using Supabase CLI or pg_dump
pg_dump $DATABASE_URL > backup.sql
```

#### 2. Restore from Backup
```bash
# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Best Practices

### 1. Migration Naming
- Use descriptive names: `add_user_avatar`, `remove_deprecated_fields`
- Include ticket numbers: `feat_123_add_user_preferences`

### 2. Schema Changes
- Always test migrations on a copy of production data
- Use optional fields when adding new columns to avoid breaking changes
- Consider data migration scripts for complex changes

### 3. Environment Management
- Use different databases for development, staging, and production
- Never run `bunx prisma migrate reset` on production
- Always backup before major migrations

### 4. Code Generation
- Run `bunx prisma generate` after every schema change
- Commit generated files to version control
- Use CI/CD to ensure generated code is up to date

### 5. Repository Pattern Integration
```typescript
// Always use repository pattern for database operations
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userData: CreateUserDto): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data: userData,
      include: { roles: true },
    });
  }
}
```

### 6. Type Safety
```typescript
// Use generated types for type safety
import { User, UserRole, Role } from '../generated/prisma';

export type UserWithRoles = User & { roles: UserRole[] };
```

## Quick Reference

| Task | Command |
|------|---------|
| Create migration | `bunx prisma migrate dev --name <name>` |
| Deploy to production | `bunx prisma migrate deploy` |
| Generate client | `bunx prisma generate` |
| Reset database | `bunx prisma migrate reset` |
| Check status | `bunx prisma migrate status` |
| Open Studio | `bunx prisma studio` |
| Push schema | `bunx prisma db push` |
| Pull from DB | `bunx prisma db pull` |
| Run seed | `bunx prisma db seed` |

## Support

For additional help:
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [NestJS Prisma Integration](https://docs.nestjs.com/recipes/prisma) 