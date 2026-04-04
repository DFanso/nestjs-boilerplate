import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserWithRoles } from '../users/users.repository';
import { Role } from '../types/role.enum';

interface AuthTokenPayload {
  sub: string;
  email: string;
  username: string;
  roles: Role[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ user: Omit<UserWithRoles, 'password'>; access_token: string }> {
    const user = await this.usersService.createUser(createUserDto);

    const payload = this.buildTokenPayload(user);
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: Omit<UserWithRoles, 'password'>; access_token: string }> {
    const user = await this.usersService.validateUserPassword(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = this.buildTokenPayload(user);
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findOne({ id: userId });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private buildTokenPayload(user: UserWithRoles): AuthTokenPayload {
    return {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles?.map((role) => role.role as Role) ?? [],
    };
  }
}
