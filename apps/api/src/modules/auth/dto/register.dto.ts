import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'test_player' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/i, {
    message: 'Username may only contain letters, numbers, and underscores',
  })
  username!: string;

  @ApiProperty({ example: 'test@heliora.game' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'changeme123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Nova Rook' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  characterName!: string;
}
