import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SessionParamsDto {
  @ApiProperty({
    example: '8a2500f8-c56d-4e09-a281-6f7f4efced26',
    description: 'Refresh session identifier',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
