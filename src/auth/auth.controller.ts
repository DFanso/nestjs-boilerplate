import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { Role } from '../types/role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in and get a JWT' })
  @ApiResponse({ status: 200, description: 'Returns an access token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@Request() req: { user: AuthenticatedUser }) {
    return this.authService.getProfile(req.user.id);
  }
}
