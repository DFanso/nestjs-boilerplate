import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'ChangeMe123!';

async function main() {
  const email = process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const username = process.env.ADMIN_USERNAME ?? DEFAULT_USERNAME;
  const password = process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (password === DEFAULT_PASSWORD && nodeEnv === 'production') {
    console.warn(
      '[seed] ADMIN_PASSWORD is the default value. Set ADMIN_PASSWORD in the environment for production.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      username,
      password: passwordHash,
      roles: {
        create: { role: Role.ADMIN },
      },
    },
  });

  const hasAdminRole = await prisma.userRole.findFirst({
    where: { userId: user.id, role: Role.ADMIN },
  });

  if (!hasAdminRole) {
    await prisma.userRole.create({
      data: { userId: user.id, role: Role.ADMIN },
    });
  }

  console.log(`[seed] Admin user ensured: ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
