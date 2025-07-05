import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../generated/prisma';
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
    // Business logic: Create user through users service
    const user = await this.usersService.createUser(createUserDto);
    
    // Business logic: Generate JWT token
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
    // Business logic: Validate user credentials
    const user = await this.usersService.validateUserPassword(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Business logic: Generate JWT token
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

  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'> | null> {
    // Business logic: Validate user for passport strategy
    const user = await this.usersService.validateUserPassword(email, pass);
    
    if (user) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    // Business logic: Get user profile
    const user = await this.usersService.findById(userId);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
} 