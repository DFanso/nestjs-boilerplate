import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository, UserWithRoles } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserWithRoles> {
    const existingUser = await this.usersRepository.existsByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.usersRepository.findByEmail(email);
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

  async updateUser(id: string, updateData: Partial<User>): Promise<UserWithRoles> {
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

  async getUsers(page: number = 1, limit: number = 10): Promise<{ users: UserWithRoles[]; total: number; page: number; totalPages: number }> {
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

  async validateUserPassword(email: string, password: string): Promise<UserWithRoles | null> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    // Business logic: Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : null;
  }
} 