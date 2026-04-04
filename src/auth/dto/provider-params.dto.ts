import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ProviderParamsDto {
  @ApiProperty({ example: 'google', description: 'Provider name' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({
    example: '109876543210987654321',
    description: 'Stable provider account identifier',
  })
  @IsString()
  @IsNotEmpty()
  providerAccountId: string;
}
