import {
  Headers,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { ExchangeAuthDto } from './dto/exchange-auth.dto';
import { LoginDto } from './dto/login.dto';
import { ProviderParamsDto } from './dto/provider-params.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SessionParamsDto } from './dto/session-params.dto';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { Role } from '../types/role.enum';
import { ExchangeSecretGuard } from './exchange-secret.guard';
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

  @UseGuards(ExchangeSecretGuard)
  @Post('exchange')
  @ApiOperation({
    summary: 'Exchange a trusted external identity for a Nest access token',
  })
  @ApiResponse({ status: 201, description: 'Returns a Nest access token.' })
  @ApiResponse({ status: 401, description: 'Invalid exchange secret.' })
  async exchangeIdentity(
    @Headers('x-auth-exchange-secret') _exchangeSecret: string,
    @Body() exchangeAuthDto: ExchangeAuthDto,
  ) {
    return this.authService.exchangeIdentity(exchangeAuthDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiResponse({
    status: 201,
    description: 'Returns a new access and refresh token pair.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token is invalid or expired.',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshSession(refreshTokenDto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current refresh token session' })
  @ApiResponse({ status: 201, description: 'Refresh token session revoked.' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.revokeSession(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'List active refresh sessions for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Returns active refresh sessions.' })
  async listSessions(@Request() req: { user: AuthenticatedUser }) {
    return this.authService.listSessions(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Revoke one refresh session for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Refresh session revoked.' })
  async revokeSessionById(
    @Request() req: { user: AuthenticatedUser },
    @Param() params: SessionParamsDto,
  ) {
    return this.authService.revokeSessionById(req.user.id, params.sessionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('providers')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'List linked external providers for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns linked provider accounts.',
  })
  async listProviders(@Request() req: { user: AuthenticatedUser }) {
    return this.authService.listLinkedProviders(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('providers/link')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Link an external provider to the authenticated user',
  })
  @ApiResponse({ status: 201, description: 'Provider linked successfully.' })
  async linkProvider(
    @Request() req: { user: AuthenticatedUser },
    @Body() exchangeAuthDto: ExchangeAuthDto,
  ) {
    return this.authService.linkProvider(req.user.id, exchangeAuthDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('providers/:provider/:providerAccountId')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Unlink an external provider from the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Provider unlinked successfully.' })
  async unlinkProvider(
    @Request() req: { user: AuthenticatedUser },
    @Param() params: ProviderParamsDto,
  ) {
    return this.authService.unlinkProvider(
      req.user.id,
      params.provider,
      params.providerAccountId,
    );
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
