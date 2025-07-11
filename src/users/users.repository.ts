import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, UserRole, Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

export type UserWithRoles = User & { roles: UserRole[] };

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userData: CreateUserDto & { password: string }): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        roles: {
          create: [
            {
              role: Role.USER,
            },
          ],
        },
      },
      include: {
        roles: true,
      },
    });
  }

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
      },
    });
  }

  async findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });
  }

  async findOne(filter: Prisma.UserWhereInput): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: filter,
      include: {
        roles: true,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<UserWithRoles> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        roles: true,
      },
    });
  }

  async delete(id: string): Promise<UserWithRoles> {
    return this.prisma.user.delete({
      where: { id },
      include: {
        roles: true,
      },
    });
  }

  async findMany(skip?: number, take?: number): Promise<UserWithRoles[]> {
    return this.prisma.user.findMany({
      skip,
      take,
      include: {
        roles: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }
} 