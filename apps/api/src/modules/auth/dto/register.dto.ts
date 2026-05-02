import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const VALID_BACKSTORIES = [
  'EX_SOLDIER',
  'SMUGGLER',
  'CORPORATE_DRONE',
  'STREET_HACKER',
  'DRIFTER',
];

export class StatAllocationDto {
  @IsOptional() @IsInt() @Min(0) @Max(8) strength?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8) agility?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8) intelligence?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8) charisma?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8) hacking?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8) combat?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8) stealth?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8) engineering?: number;
}

export class RegisterDto {
  @ApiProperty({ example: 'test_player' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username may only contain lowercase letters, numbers, and underscores',
  })
  username!: string;

  @ApiProperty({ example: 'test@heliora.game' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Heliora123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must include at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @ApiProperty({ example: 'Nova Rook' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  characterName!: string;

  @ApiPropertyOptional({
    example: 'DRIFTER',
    enum: VALID_BACKSTORIES,
    description: 'Backstory archetype that grants starting stat bonuses and credits',
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_BACKSTORIES)
  backstory?: string;

  @ApiPropertyOptional({
    example: 'I came here looking for my brother.',
    description: 'Free-form motivation: why is this character on Hibaro-5?',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivation?: string;

  @ApiPropertyOptional({
    description: 'Optional stat point allocation. Each key 0-8, total must not exceed 12.',
    example: { hacking: 4, intelligence: 4, stealth: 4 },
  })
  @IsOptional()
  @IsObject()
  statAllocation?: StatAllocationDto;
}
