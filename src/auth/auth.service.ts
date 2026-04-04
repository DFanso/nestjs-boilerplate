import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginDto } from './dto/login.dto';
import {
  UserWithRoles,
  UserWithRolesAndAccounts,
} from '../users/users.repository';
import { Role } from '../types/role.enum';
import { SocialAuthProfile } from '../users/users.service';
import { ExchangeAuthDto } from './dto/exchange-auth.dto';

interface AuthTokenPayload {
  sub: string;
  email: string;
  username: string;
  avatar?: string;
  roles: Role[];
}

export interface AuthUserResponse extends Omit<User, 'password'> {
  roles: UserRole[];
}

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

export interface AuthTokensResponse {
  user: AuthUserResponse;
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthTokensResponse> {
    const user = await this.usersService.createUser(createUserDto);

    return this.issueAuthTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.usersService.validateUserPassword(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueAuthTokens(user);
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findOne({ id: userId });
    return this.buildProfileResponse(user);
  }

  async exchangeIdentity(input: ExchangeAuthDto): Promise<AuthTokensResponse> {
    const user = await this.usersService.findOrCreateSocialUser(
      this.mapExternalProfile(input),
    );

    return this.issueAuthTokens(user);
  }

  async linkProvider(
    userId: string,
    input: ExchangeAuthDto,
  ): Promise<AuthUserResponse> {
    const user = await this.usersService.linkProviderAccountToUser(
      userId,
      this.mapExternalProfile(input),
    );

    return this.buildAuthUserResponse(user);
  }

  async unlinkProvider(
    userId: string,
    provider: string,
    providerAccountId: string,
  ): Promise<AuthUserResponse> {
    const user = await this.usersService.unlinkProviderAccountFromUser(
      userId,
      provider,
      providerAccountId,
    );

    return this.buildAuthUserResponse(user);
  }

  async refreshSession(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthTokensResponse> {
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    const refreshTokenHash = this.hashRefreshToken(
      refreshTokenDto.refreshToken,
    );
    const session =
      await this.usersService.findAuthSessionByHash(refreshTokenHash);

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (session.id !== payload.sid || session.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    await this.usersService.touchAuthSession(session.id);
    await this.usersService.revokeAuthSession(session.id);

    const user = await this.usersService.findById(payload.sub);

    return this.issueAuthTokens(user);
  }

  async revokeSession(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ revoked: true }> {
    const refreshTokenHash = this.hashRefreshToken(
      refreshTokenDto.refreshToken,
    );
    const session =
      await this.usersService.findAuthSessionByHash(refreshTokenHash);

    if (session && !session.revokedAt) {
      await this.usersService.revokeAuthSession(session.id);
    }

    return { revoked: true };
  }

  async listSessions(userId: string): Promise<
    {
      id: string;
      expiresAt: Date;
      lastUsedAt: Date | null;
      createdAt: Date;
      revokedAt: Date | null;
    }[]
  > {
    const sessions =
      await this.usersService.listActiveAuthSessionsForUser(userId);

    return sessions.map((session) => ({
      id: session.id,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      revokedAt: session.revokedAt,
    }));
  }

  async revokeSessionById(
    userId: string,
    sessionId: string,
  ): Promise<{ revoked: true }> {
    await this.usersService.revokeAuthSessionForUser(userId, sessionId);
    return { revoked: true };
  }

  async listLinkedProviders(userId: string): Promise<
    {
      id: string;
      provider: string;
      providerAccountId: string;
      createdAt: Date;
    }[]
  > {
    const user = await this.usersService.findById(userId);
    const withAccounts = await this.usersService.findByEmailWithAccounts(
      user.email,
    );

    if (!withAccounts) {
      throw new NotFoundException('User not found');
    }

    return withAccounts.accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      createdAt: account.createdAt,
    }));
  }

  private buildTokenPayload(
    user: UserWithRoles | UserWithRolesAndAccounts,
  ): AuthTokenPayload {
    return {
      sub: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar ?? undefined,
      roles: user.roles?.map((role) => role.role as Role) ?? [],
    };
  }

  private buildAuthUserResponse(
    user: UserWithRoles | UserWithRolesAndAccounts,
  ): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles,
    };
  }

  private buildProfileResponse(user: User): Omit<User, 'password'> {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async issueAuthTokens(
    user: UserWithRoles | UserWithRolesAndAccounts,
  ): Promise<AuthTokensResponse> {
    const sessionId = randomUUID();
    const accessToken = this.jwtService.sign(this.buildTokenPayload(user), {
      expiresIn: this.getAccessTokenTtlSeconds(),
    });
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sid: sessionId,
        type: 'refresh',
      } satisfies RefreshTokenPayload,
      {
        expiresIn: this.getRefreshTokenTtlSeconds(),
      },
    );

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + this.getRefreshTokenTtlSeconds() * 1000,
    );

    await this.usersService.createAuthSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    return {
      user: this.buildAuthUserResponse(user),
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    const payload =
      await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    return payload;
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getAccessTokenTtlSeconds(): number {
    return this.parseDurationToSeconds(
      this.configService.get<string>('ACCESS_TOKEN_TTL') ?? '15m',
    );
  }

  private getRefreshTokenTtlSeconds(): number {
    return this.parseDurationToSeconds(
      this.configService.get<string>('REFRESH_TOKEN_TTL') ?? '30d',
    );
  }

  private parseDurationToSeconds(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 30 * 24 * 60 * 60;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return amount * multipliers[unit];
  }

  private mapExternalProfile(input: ExchangeAuthDto): SocialAuthProfile {
    return {
      email: input.email,
      username: input.username,
      avatar: input.avatar,
      emailVerifiedAt: new Date(input.emailVerifiedAt),
      providerAccount: {
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        idToken: input.idToken,
        tokenType: input.tokenType,
        scope: input.scope,
        expiresAt: input.expiresAt,
      },
    };
  }
}
