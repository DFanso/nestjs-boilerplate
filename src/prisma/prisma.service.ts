import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Use existing instance if available (for hot-reloading in development)
    if (globalForPrisma.prisma) {
      return globalForPrisma.prisma as PrismaService;
    }
    
    super();
    
    // Store instance globally in development to prevent multiple instances
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = this;
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await this.$disconnect();
      await app.close();
    });
  }
} 