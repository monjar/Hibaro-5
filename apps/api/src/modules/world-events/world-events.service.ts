import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorldEventScope, WorldEventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SCOPES: WorldEventScope[] = [
  'CHARACTER',
  'BUILDING',
  'DISTRICT',
  'PLANET',
  'FACTION',
  'CORPORATION',
  'WORLD',
];

const STATUSES: WorldEventStatus[] = ['SCHEDULED', 'ACTIVE', 'RESOLVED', 'CANCELLED'];

export interface AdminWorldEventInput {
  title: string;
  description?: string | null;
  scope: WorldEventScope;
  triggeredByType?: string | null;
  triggeredById?: string | null;
  affectedEntities?: unknown[];
  requirements?: unknown[];
  effects?: unknown[];
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  status?: WorldEventStatus;
}

@Injectable()
export class WorldEventsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.worldEvent.findMany({ orderBy: { startsAt: 'desc' } });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.worldEvent.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.worldEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(`World event ${id} not found`);
    return event;
  }

  async create(data: AdminWorldEventInput) {
    this.validate(data);
    return this.prisma.worldEvent.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        scope: data.scope,
        triggeredByType: data.triggeredByType ?? null,
        triggeredById: data.triggeredById ?? null,
        affectedEntities: (data.affectedEntities ?? []) as never,
        requirements: (data.requirements ?? []) as never,
        effects: (data.effects ?? []) as never,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        status: data.status ?? 'SCHEDULED',
      },
    });
  }

  async update(id: string, data: Partial<AdminWorldEventInput>) {
    await this.findById(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    if (data.scope && !SCOPES.includes(data.scope)) {
      throw new BadRequestException(`scope must be one of ${SCOPES.join(', ')}`);
    }
    if (data.status && !STATUSES.includes(data.status)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    return this.prisma.worldEvent.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.scope !== undefined ? { scope: data.scope } : {}),
        ...(data.triggeredByType !== undefined ? { triggeredByType: data.triggeredByType } : {}),
        ...(data.triggeredById !== undefined ? { triggeredById: data.triggeredById } : {}),
        ...(data.affectedEntities !== undefined
          ? { affectedEntities: data.affectedEntities as never }
          : {}),
        ...(data.requirements !== undefined ? { requirements: data.requirements as never } : {}),
        ...(data.effects !== undefined ? { effects: data.effects as never } : {}),
        ...(data.startsAt !== undefined
          ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
          : {}),
        ...(data.endsAt !== undefined
          ? { endsAt: data.endsAt ? new Date(data.endsAt) : null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.worldEvent.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validate(input: AdminWorldEventInput) {
    if (!input.title || input.title.trim().length < 3) {
      throw new BadRequestException('Title must be at least 3 characters');
    }
    if (!input.scope) {
      throw new BadRequestException('scope is required');
    }
    if (!SCOPES.includes(input.scope)) {
      throw new BadRequestException(`scope must be one of ${SCOPES.join(', ')}`);
    }
    if (input.status && !STATUSES.includes(input.status)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    if (input.startsAt && input.endsAt) {
      const start = new Date(input.startsAt);
      const end = new Date(input.endsAt);
      if (end < start) {
        throw new BadRequestException('endsAt must be on or after startsAt');
      }
    }
  }
}
