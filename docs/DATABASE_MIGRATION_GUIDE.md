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

- Node.js and pnpm installed
- Supabase project set up
- Environment variables configured
- Prisma CLI installed (`npx prisma` or global installation)

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
npx prisma migrate dev --name <migration_name>

# Example: Adding a new field
npx prisma migrate dev --name add_user_avatar
```

#### 2. Generate Prisma Client
```bash
# Generate TypeScript client after schema changes
npx prisma generate
```

#### 3. Reset Database (Development Only)
```bash
# Reset database and apply all migrations
npx prisma migrate reset
```

#### 4. Check Migration Status
```bash
# Check which migrations have been applied
npx prisma migrate status
```

### Production Workflow

#### 1. Deploy Migrations
```bash
# Apply pending migrations to production database
npx prisma migrate deploy
```

#### 2. Database Push (Alternative for prototyping)
```bash
# Push schema changes directly without creating migration files
# Use only in development for rapid prototyping
npx prisma db push
```

### Database Inspection

#### 1. View Database in Prisma Studio
```bash
# Open Prisma Studio to view and edit data
npx prisma studio
```

#### 2. Introspect Existing Database
```bash
# Generate Prisma schema from existing database
npx prisma db pull
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
npx prisma migrate dev --name add_post_model
```

3. **Generate Client**:
```bash
npx prisma generate
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
npx prisma migrate dev --name add_username_field
```

### 3. Data Seeding

Create a seed script `prisma/seed.ts`:

```typescript
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      roles: {
        create: [
          { role: Role.ADMIN },
          { role: Role.USER },
        ],
      },
    },
  });

  console.log('Created admin user:', adminUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```bash
npx prisma db seed
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Migration Conflicts
```bash
# If migrations are out of sync
npx prisma migrate resolve --applied <migration_name>
```

#### 2. Database Connection Issues
- Check if Supabase database is running
- Verify connection strings in `.env`
- Ensure database credentials are correct

#### 3. Schema Drift
```bash
# Check if database schema differs from Prisma schema
npx prisma db push --preview-feature
```

#### 4. Prisma Client Issues
```bash
# Regenerate Prisma client
rm -rf generated/prisma
npx prisma generate
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
- Never run `prisma migrate reset` on production
- Always backup before major migrations

### 4. Code Generation
- Run `npx prisma generate` after every schema change
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
| Create migration | `npx prisma migrate dev --name <name>` |
| Deploy to production | `npx prisma migrate deploy` |
| Generate client | `npx prisma generate` |
| Reset database | `npx prisma migrate reset` |
| Check status | `npx prisma migrate status` |
| Open Studio | `npx prisma studio` |
| Push schema | `npx prisma db push` |
| Pull from DB | `npx prisma db pull` |
| Run seed | `npx prisma db seed` |

## Support

For additional help:
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [NestJS Prisma Integration](https://docs.nestjs.com/recipes/prisma) 