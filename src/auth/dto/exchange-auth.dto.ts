import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExchangeAuthDto {
  @ApiProperty({
    example: 'google',
    description: 'External identity provider name from Auth.js',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  provider: string;

  @ApiProperty({
    example: '109876543210987654321',
    description: 'Stable provider account identifier',
  })
  @IsString()
  @IsNotEmpty()
  providerAccountId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Verified email address from the identity provider',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Jane Tester',
    description: 'Display name from the provider profile',
    minLength: 2,
    maxLength: 60,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  username: string;

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/a/avatar',
    description: 'Optional avatar URL from the provider profile',
  })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiProperty({
    example: '2026-04-04T08:00:00.000Z',
    description: 'Provider verified-email timestamp in ISO format',
  })
  @IsString()
  @IsNotEmpty()
  emailVerifiedAt: string;

  @ApiPropertyOptional({
    example: 'ya29.a0AfH6SMA...',
    description: 'Optional provider access token for future API calls',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    example: '1//0gRefreshToken',
    description: 'Optional provider refresh token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...',
    description: 'Optional provider ID token',
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({
    example: 'Bearer',
    description: 'Provider token type',
  })
  @IsOptional()
  @IsString()
  tokenType?: string;

  @ApiPropertyOptional({
    example: 'openid email profile',
    description: 'Granted provider scopes',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    example: 1743753600,
    description: 'Access token expiry timestamp in seconds',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  expiresAt?: number;
}
