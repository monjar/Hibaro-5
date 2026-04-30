import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async getSolarSystems() {
    return this.prisma.solarSystem.findMany({ include: { planets: true } });
  }

  async getPlanets() {
    return this.prisma.planet.findMany({ include: { solarSystem: true, districts: true } });
  }

  async getPlanetById(id: string) {
    const planet = await this.prisma.planet.findUnique({
      where: { id },
      include: { solarSystem: true, districts: { include: { buildings: true } } },
    });
    if (!planet) throw new NotFoundException(`Planet ${id} not found`);
    return planet;
  }

  async getDistrictById(id: string) {
    const district = await this.prisma.district.findUnique({
      where: { id },
      include: { planet: true, buildings: true, controllingFaction: true },
    });
    if (!district) throw new NotFoundException(`District ${id} not found`);
    return district;
  }

  async getBuildingById(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: { district: { include: { planet: true } } },
    });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }
}
