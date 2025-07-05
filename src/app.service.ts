import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  // Example of how to use PrismaService
  // async getPosts() {
  //   return this.prisma.post.findMany();
  // }
}
