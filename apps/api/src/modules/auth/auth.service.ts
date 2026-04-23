import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const PASSWORD_HASH_KEY_LENGTH = 32;
const PASSWORD_HASH_OPTIONS = {
  N: 32768,
  r: 8,
  p: 1,
} as const;

export interface AuthenticatedPlayer {
  sub: string;
  username: string;
}

type SafePlayer = {
  id: string;
  username: string;
  email: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  character: {
    id: string;
    name: string;
    type: string;
    credits: number;
    health: number;
    maxHealth: number;
    energy: number;
    maxEnergy: number;
    wantedLevel: number;
    currentPlanetId: string | null;
    currentDistrictId: string | null;
    currentBuildingId: string | null;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const username = dto.username.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();
    const characterName = dto.characterName.trim();

    const existingPlayer = await this.prisma.player.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingPlayer) {
      throw new ConflictException('A player with that username or email already exists');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const startingLocation = await this.resolveStartingLocation();

    const player = await this.prisma.$transaction(async (tx) => {
      const createdPlayer = await tx.player.create({
        data: {
          username,
          email,
          passwordHash,
        },
      });

      const character = await tx.character.create({
        data: {
          name: characterName,
          type: 'PLAYER',
          playerId: createdPlayer.id,
          currentPlanetId: startingLocation?.planetId,
          currentDistrictId: startingLocation?.districtId,
          currentBuildingId: startingLocation?.buildingId,
          credits: 250,
          health: 100,
          maxHealth: 100,
          energy: 100,
          maxEnergy: 100,
          wantedLevel: 0,
          strength: 6,
          agility: 5,
          intelligence: 7,
          charisma: 6,
          hacking: 5,
          combat: 5,
          stealth: 5,
          engineering: 6,
          reputation: 0,
        },
      });

      await tx.activityLog.create({
        data: {
          playerId: createdPlayer.id,
          characterId: character.id,
          type: 'REGISTERED',
          message: `${character.name} entered Hibaro-5.`,
          relatedEntities: startingLocation ?? undefined,
        },
      });

      return tx.player.findUniqueOrThrow({
        where: { id: createdPlayer.id },
        include: { character: true },
      });
    });

    return this.buildAuthResponse(player);
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const normalizedIdentifier = identifier.toLowerCase();

    const player = await this.prisma.player.findFirst({
      where: {
        OR: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
      },
      include: { character: true },
    });

    if (!player || !(await this.verifyPassword(dto.password, player.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updatedPlayer = await this.prisma.player.update({
      where: { id: player.id },
      data: { lastLoginAt: new Date() },
      include: { character: true },
    });

    return this.buildAuthResponse(updatedPlayer);
  }

  async getCurrentPlayer(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { character: true },
    });

    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    return this.sanitizePlayer(player);
  }

  private async resolveStartingLocation() {
    const startingBuilding =
      (await this.prisma.building.findFirst({
        where: {
          name: 'Arrival Processing Hub',
          district: {
            name: 'Arrival Yard',
            planet: { name: 'Antrolus' },
          },
        },
        include: {
          district: { include: { planet: true } },
        },
      })) ??
      (await this.prisma.building.findFirst({
        include: {
          district: { include: { planet: true } },
        },
      }));

    if (!startingBuilding) {
      return null;
    }

    return {
      planetId: startingBuilding.district.planet.id,
      districtId: startingBuilding.district.id,
      buildingId: startingBuilding.id,
    };
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = await this.derivePasswordKey(password, salt);
    return `${salt}:${hash.toString('hex')}`;
  }

  private async verifyPassword(password: string, passwordHash: string) {
    const [salt, storedHash] = passwordHash.split(':');
    if (!salt || !storedHash) {
      return false;
    }

    const candidateHash = await this.derivePasswordKey(password, salt);
    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    if (storedHashBuffer.length !== candidateHash.length) {
      return false;
    }

    return timingSafeEqual(storedHashBuffer, candidateHash);
  }

  private async buildAuthResponse(player: {
    id: string;
    username: string;
    passwordHash: string;
    email: string | null;
    createdAt: Date;
    lastLoginAt: Date;
    character: SafePlayer['character'];
  }) {
    const accessToken = await this.jwtService.signAsync({
      sub: player.id,
      username: player.username,
    });

    return {
      accessToken,
      player: this.sanitizePlayer(player),
    };
  }

  private sanitizePlayer(player: {
    id: string;
    username: string;
    passwordHash: string;
    email: string | null;
    createdAt: Date;
    lastLoginAt: Date;
    character: SafePlayer['character'];
  }): SafePlayer {
    const safePlayer: Partial<typeof player> = { ...player };
    delete safePlayer.passwordHash;
    return safePlayer as SafePlayer;
  }

  private async derivePasswordKey(password: string, salt: string) {
    return new Promise<Buffer>((resolve, reject) => {
      scryptCallback(
        password,
        salt,
        PASSWORD_HASH_KEY_LENGTH,
        PASSWORD_HASH_OPTIONS,
        (error, derivedKey) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(derivedKey as Buffer);
        },
      );
    });
  }
}
