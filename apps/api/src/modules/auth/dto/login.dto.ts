import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'test_player' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;

  @ApiProperty({ example: 'Heliora123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
