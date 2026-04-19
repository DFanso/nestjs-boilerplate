#!/bin/sh
set -e

echo "🚀 Starting application initialization..."

# Run Prisma migrations (will create database if it doesn't exist)
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed successfully"

# Run database seed
echo "🌱 Running database seed..."
npx prisma db seed || echo "⚠️ Seed skipped or failed"
echo "✅ Database seeding completed"

# Start the application
echo "🚀 Starting application..."
exec dumb-init node dist/src/main.js