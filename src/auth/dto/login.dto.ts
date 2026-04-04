import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password for the user',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
