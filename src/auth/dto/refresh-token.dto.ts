import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Previously issued refresh token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
