import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserWithRoles } from '../users/users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<{ user: Omit<UserWithRoles, 'password'>; access_token: string }> {
    const user = await this.usersService.createUser(createUserDto);
    
    const payload = { 
      email: user.email, 
      sub: user.id,
      roles: user.roles?.map(r => r.role) || []
    };
    
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: Omit<UserWithRoles, 'password'>; access_token: string }> {
    const user = await this.usersService.validateUserPassword(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      email: user.email, 
      sub: user.id,
      roles: user.roles?.map(r => r.role) || []
    };
    
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
} 