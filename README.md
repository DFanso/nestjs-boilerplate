# 🚀 NestJS Boilerplate

A production-ready NestJS boilerplate with JWT authentication, Prisma ORM, Supabase PostgreSQL, and modern development tools.

## ✨ Features

- 🔐 **JWT Authentication** with ES256 (ECDSA) encryption
- 🗃️ **Prisma ORM** with Supabase PostgreSQL
- 📚 **API Versioning** (v1) with Swagger documentation
- 🛡️ **Security** with Helmet, CORS, and rate limiting
- 🏗️ **Repository Pattern** for clean architecture
- 📝 **Request Logging** with Morgan
- 🔄 **Context Management** with nestjs-cls
- 🎯 **TypeScript** with strict type checking
- 📖 **Swagger/OpenAPI** documentation
- 🧪 **Testing** setup with Jest
- 🔧 **Development** tools and hot reload

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| ![NestJS](https://img.shields.io/badge/nestjs-E0234E?style=flat&logo=nestjs&logoColor=white) | Backend Framework | ^10.4.19 |
| ![TypeScript](https://img.shields.io/badge/typescript-3178C6?style=flat&logo=typescript&logoColor=white) | Language | ^5.8.3 |
| ![Prisma](https://img.shields.io/badge/prisma-2D3748?style=flat&logo=prisma&logoColor=white) | ORM | ^6.11.1 |
| ![Supabase](https://img.shields.io/badge/supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) | Database | PostgreSQL |
| ![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white) | Authentication | ES256 |
| ![Swagger](https://img.shields.io/badge/swagger-85EA2D?style=flat&logo=swagger&logoColor=black) | API Documentation | ^11.2.0 |

## 🚦 Quick Start

### Prerequisites

- 📦 **Node.js** (v18 or higher)
- 🧶 **pnpm** package manager
- 🐘 **Supabase** account and project
- 🔑 **OpenSSL** for key generation

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nestjs-boilerplate
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your Supabase credentials
   nano .env
   ```

4. **Generate JWT keys**
   ```bash
   mkdir keys
   # Generate ECDSA private key
   openssl ecparam -name prime256v1 -genkey -noout -out keys/private.pem
   # Generate public key
   openssl ec -in keys/private.pem -pubout -out keys/public.pem
   ```

5. **Database setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Apply database migrations
   npx prisma db push
   ```

6. **Start development server**
   ```bash
   pnpm run start:dev
   ```

🎉 **Your API is now running at** `http://localhost:9000`

## 📋 Environment Variables

Create a `.env` file in the project root:

```env
# 🗄️ Database Configuration
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[region].aws.supabase.co:5432/postgres"

# 🔐 JWT Configuration
JWT_PRIVATE_KEY_PATH="./keys/private.pem"
JWT_PUBLIC_KEY_PATH="./keys/public.pem"

# 🌍 Application Configuration
NODE_ENV=development
PORT=9000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 📚 API Documentation

Once the server is running, visit:

- 📖 **Swagger UI**: `http://localhost:9000/doc`
- 🔗 **API Base URL**: `http://localhost:9000/v1`

### 🔐 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/auth/register` | Register a new user |
| `POST` | `/v1/auth/login` | Login and get JWT token |
| `GET` | `/v1/auth/profile` | Get user profile (protected) |

### 📝 Example Requests

**Register User:**
```bash
curl -X POST http://localhost:9000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:9000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:9000/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏗️ Project Structure

```
src/
├── 📁 auth/                 # Authentication module
│   ├── 📄 auth.controller.ts
│   ├── 📄 auth.service.ts
│   ├── 📄 auth.module.ts
│   ├── 📄 jwt.strategy.ts
│   ├── 📄 jwt-auth.guard.ts
│   └── 📁 dto/
├── 📁 users/                # Users module
│   ├── 📄 users.controller.ts
│   ├── 📄 users.service.ts
│   ├── 📄 users.repository.ts
│   ├── 📄 users.module.ts
│   └── 📁 dto/
├── 📁 prisma/               # Prisma service
│   ├── 📄 prisma.service.ts
│   └── 📄 prisma.module.ts
├── 📁 utils/                # Utility functions
│   ├── 📄 request-logging.ts
│   └── 📄 exception-filter.ts
├── 📄 app.module.ts         # Root module
├── 📄 app.controller.ts     # Root controller
├── 📄 app.service.ts        # Root service
└── 📄 main.ts               # Application entry point
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run start` | Start production server |
| `pnpm run start:dev` | Start development server with hot reload |
| `pnpm run start:debug` | Start server in debug mode |
| `pnpm run build` | Build the application |
| `pnpm run test` | Run unit tests |
| `pnpm run test:e2e` | Run end-to-end tests |
| `pnpm run test:cov` | Run tests with coverage |

## 🗃️ Database Operations

### Prisma Commands

| Command | Description |
|---------|-------------|
| `npx prisma generate` | Generate Prisma client |
| `npx prisma db push` | Push schema to database |
| `npx prisma migrate dev` | Create and apply migration |
| `npx prisma studio` | Open Prisma Studio |
| `npx prisma migrate status` | Check migration status |

### 📊 Database Schema

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

## 🔒 Security Features

- 🛡️ **Helmet** - Security headers
- 🔐 **CORS** - Cross-origin resource sharing
- ⏱️ **Rate Limiting** - Request throttling
- 🔑 **JWT with ES256** - Asymmetric encryption
- 🔒 **Password Hashing** - bcrypt with salt rounds
- ✅ **Input Validation** - class-validator pipes
- 🚫 **SQL Injection Protection** - Prisma ORM

## 🧪 Testing

```bash
# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run e2e tests
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov
```

## 📖 Documentation

- 📚 [Database Migration Guide](./docs/DATABASE_MIGRATION_GUIDE.md)
- 🔐 [Authentication Setup](./docs/AUTH_SETUP.md)
- 🏗️ [Architecture Guide](./docs/ARCHITECTURE.md)

## 🤝 Contributing

1. 🍴 Fork the repository
2. 🌿 Create your feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🔄 Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- 🚀 [NestJS](https://nestjs.com/) - Progressive Node.js framework
- 🔺 [Prisma](https://prisma.io/) - Next-generation ORM
- 🟢 [Supabase](https://supabase.com/) - Open source Firebase alternative
- 📝 [Swagger](https://swagger.io/) - API documentation

## 📞 Support

If you have any questions or need help, please:

- 📧 Open an issue on GitHub
- 💬 Check the documentation
- 🔍 Search existing issues

---

<div align="center">
  <p>Made with ❤️ and ☕</p>
  <p>
    <a href="#-nestjs-boilerplate">⬆️ Back to top</a>
  </p>
</div>
