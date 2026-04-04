import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Account,
  AuthSession,
  User,
  Role,
  UserRole,
  Prisma,
} from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

export type UserWithRoles = User & { roles: UserRole[] };
export type UserWithRolesAndAccounts = User & {
  roles: UserRole[];
  accounts: Account[];
};

export interface ProviderAccountInput {
  provider: string;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: number;
}

export interface AuthSessionInput {
  id?: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userData: CreateUserDto & { password: string },
  ): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        avatar: userData.avatar,
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

  async createWithProviderAccount(
    userData: Omit<CreateUserDto, 'password'> & {
      emailVerifiedAt?: Date;
      providerAccount: ProviderAccountInput;
    },
  ): Promise<UserWithRolesAndAccounts> {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        avatar: userData.avatar,
        emailVerifiedAt: userData.emailVerifiedAt,
        accounts: {
          create: {
            provider: userData.providerAccount.provider,
            providerAccountId: userData.providerAccount.providerAccountId,
            accessToken: userData.providerAccount.accessToken,
            refreshToken: userData.providerAccount.refreshToken,
            idToken: userData.providerAccount.idToken,
            tokenType: userData.providerAccount.tokenType,
            scope: userData.providerAccount.scope,
            expiresAt: userData.providerAccount.expiresAt,
          },
        },
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
        accounts: true,
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

  async findByEmailWithAccounts(
    email: string,
  ): Promise<UserWithRolesAndAccounts | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
        accounts: true,
      },
    });
  }

  async findByProviderAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<UserWithRolesAndAccounts | null> {
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: {
          include: {
            roles: true,
            accounts: true,
          },
        },
      },
    });

    return account?.user ?? null;
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

  async linkProviderAccount(
    userId: string,
    providerAccount: ProviderAccountInput,
  ): Promise<UserWithRolesAndAccounts> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        accounts: {
          create: {
            provider: providerAccount.provider,
            providerAccountId: providerAccount.providerAccountId,
            accessToken: providerAccount.accessToken,
            refreshToken: providerAccount.refreshToken,
            idToken: providerAccount.idToken,
            tokenType: providerAccount.tokenType,
            scope: providerAccount.scope,
            expiresAt: providerAccount.expiresAt,
          },
        },
      },
      include: {
        roles: true,
        accounts: true,
      },
    });
  }

  async findProviderAccountRecord(
    provider: string,
    providerAccountId: string,
  ): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });
  }

  async unlinkProviderAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
  ): Promise<UserWithRolesAndAccounts> {
    await this.prisma.account.delete({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });

    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: true,
        accounts: true,
      },
    });
  }

  async countProviderAccountsForUser(userId: string): Promise<number> {
    return this.prisma.account.count({
      where: { userId },
    });
  }

  async createAuthSession(input: AuthSessionInput): Promise<AuthSession> {
    return this.prisma.authSession.create({
      data: input,
    });
  }

  async findAuthSessionByHash(
    refreshTokenHash: string,
  ): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
    });
  }

  async revokeAuthSession(sessionId: string): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async touchAuthSession(sessionId: string): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  async listActiveAuthSessionsForUser(userId: string): Promise<AuthSession[]> {
    return this.prisma.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAuthSessionById(sessionId: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({
      where: { id: sessionId },
    });
  }
}
