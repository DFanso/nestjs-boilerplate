import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthSession, User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import {
  AuthSessionInput,
  ProviderAccountInput,
  UsersRepository,
  UserWithRoles,
  UserWithRolesAndAccounts,
} from './users.repository';

export interface SocialAuthProfile {
  email: string;
  username: string;
  avatar?: string;
  emailVerifiedAt?: Date;
  providerAccount: ProviderAccountInput;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserWithRoles> {
    const normalizedEmail = this.normalizeEmail(createUserDto.email);
    const normalizedUsername = this.normalizeUsername(createUserDto.username);

    const existingEmail =
      await this.usersRepository.existsByEmail(normalizedEmail);

    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.usersRepository.create({
      ...createUserDto,
      email: normalizedEmail,
      username: normalizedUsername,
      password: hashedPassword,
    });
  }

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.usersRepository.findByEmail(this.normalizeEmail(email));
  }

  async findByEmailWithAccounts(
    email: string,
  ): Promise<UserWithRolesAndAccounts | null> {
    return this.usersRepository.findByEmailWithAccounts(
      this.normalizeEmail(email),
    );
  }

  async findByProviderAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<UserWithRolesAndAccounts | null> {
    return this.usersRepository.findByProviderAccount(
      provider,
      providerAccountId,
    );
  }

  async findById(id: string): Promise<UserWithRoles> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOne(filter: { [key: string]: any }): Promise<UserWithRoles | null> {
    return this.usersRepository.findOne(filter);
  }

  async updateUser(
    id: string,
    updateData: Partial<User>,
  ): Promise<UserWithRoles> {
    // Business logic: Ensure user exists
    await this.findById(id);

    // Business logic: If updating password, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    return this.usersRepository.update(id, updateData);
  }

  async deleteUser(id: string): Promise<UserWithRoles> {
    // Business logic: Ensure user exists
    await this.findById(id);

    return this.usersRepository.delete(id);
  }

  async getUsers(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    users: UserWithRoles[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Business logic: Get paginated results
    const [users, total] = await Promise.all([
      this.usersRepository.findMany(skip, limit),
      this.usersRepository.count(),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async validateUserPassword(
    email: string,
    password: string,
  ): Promise<UserWithRoles | null> {
    const user = await this.usersRepository.findByEmail(
      this.normalizeEmail(email),
    );

    if (!user) {
      return null;
    }

    if (!user.password) {
      return null;
    }

    // Business logic: Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : null;
  }

  async findOrCreateSocialUser(
    profile: SocialAuthProfile,
  ): Promise<UserWithRolesAndAccounts> {
    const normalizedEmail = this.normalizeEmail(profile.email);
    const normalizedUsername = this.normalizeUsername(profile.username);

    const linkedUser = await this.usersRepository.findByProviderAccount(
      profile.providerAccount.provider,
      profile.providerAccount.providerAccountId,
    );

    if (linkedUser) {
      return linkedUser;
    }

    const existingUser =
      await this.usersRepository.findByEmailWithAccounts(normalizedEmail);

    if (existingUser) {
      if (!profile.emailVerifiedAt) {
        throw new UnauthorizedException(
          'Verified provider email is required to link this account',
        );
      }

      return this.usersRepository.linkProviderAccount(existingUser.id, {
        ...profile.providerAccount,
      });
    }

    return this.usersRepository.createWithProviderAccount({
      email: normalizedEmail,
      username: normalizedUsername,
      avatar: profile.avatar,
      emailVerifiedAt: profile.emailVerifiedAt,
      providerAccount: profile.providerAccount,
    });
  }

  async linkProviderAccountToUser(
    userId: string,
    profile: SocialAuthProfile,
  ): Promise<UserWithRolesAndAccounts> {
    const existingLink = await this.usersRepository.findProviderAccountRecord(
      profile.providerAccount.provider,
      profile.providerAccount.providerAccountId,
    );

    if (existingLink && existingLink.userId !== userId) {
      throw new ConflictException('This provider account is already linked');
    }

    if (existingLink?.userId === userId) {
      const user = await this.usersRepository.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return this.usersRepository
        .findByEmailWithAccounts(user.email)
        .then((value) => {
          if (!value) {
            throw new NotFoundException('User not found');
          }

          return value;
        });
    }

    if (!profile.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Verified provider email is required to link this account',
      );
    }

    return this.usersRepository.linkProviderAccount(
      userId,
      profile.providerAccount,
    );
  }

  async unlinkProviderAccountFromUser(
    userId: string,
    provider: string,
    providerAccountId: string,
  ): Promise<UserWithRolesAndAccounts> {
    const providerAccount =
      await this.usersRepository.findProviderAccountRecord(
        provider,
        providerAccountId,
      );

    if (!providerAccount || providerAccount.userId !== userId) {
      throw new NotFoundException('Linked provider account not found');
    }

    const user = await this.findById(userId);
    const accountCount =
      await this.usersRepository.countProviderAccountsForUser(userId);
    const hasPassword = Boolean(user.password);

    if (!hasPassword && accountCount <= 1) {
      throw new ForbiddenException(
        'You cannot unlink your last sign-in method',
      );
    }

    return this.usersRepository.unlinkProviderAccount(
      userId,
      provider,
      providerAccountId,
    );
  }

  async createAuthSession(input: AuthSessionInput): Promise<AuthSession> {
    return this.usersRepository.createAuthSession(input);
  }

  async findAuthSessionByHash(
    refreshTokenHash: string,
  ): Promise<AuthSession | null> {
    return this.usersRepository.findAuthSessionByHash(refreshTokenHash);
  }

  async revokeAuthSession(sessionId: string): Promise<AuthSession> {
    return this.usersRepository.revokeAuthSession(sessionId);
  }

  async touchAuthSession(sessionId: string): Promise<AuthSession> {
    return this.usersRepository.touchAuthSession(sessionId);
  }

  async listActiveAuthSessionsForUser(userId: string): Promise<AuthSession[]> {
    return this.usersRepository.listActiveAuthSessionsForUser(userId);
  }

  async revokeAuthSessionForUser(
    userId: string,
    sessionId: string,
  ): Promise<AuthSession> {
    const session = await this.usersRepository.findAuthSessionById(sessionId);

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    return this.usersRepository.revokeAuthSession(sessionId);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeUsername(username: string): string {
    return username.trim().split(/\s+/).filter(Boolean).join(' ');
  }
}
