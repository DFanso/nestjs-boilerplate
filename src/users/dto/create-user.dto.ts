import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Display name of the user',
    minLength: 2,
    maxLength: 60,
    pattern: "^[A-Za-z]+(?:[ '-][A-Za-z]+)*$",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/)
  username: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password for the user',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
