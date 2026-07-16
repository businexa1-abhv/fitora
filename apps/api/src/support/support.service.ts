import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import {
  CreateSupportTicketDto,
  ListSupportTicketsQueryDto,
  UpdateSupportTicketDto,
} from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListSupportTicketsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.SupportTicketWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { subject: { contains: query.search, mode: 'insensitive' } },
          { requesterEmail: { contains: query.search, mode: 'insensitive' } },
          { requesterName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          tenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      items: items.map((ticket) => this.formatTicket(ticket)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async create(dto: CreateSupportTicketDto, createdById?: string) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: dto.subject,
        body: dto.body,
        requesterEmail: dto.requesterEmail,
        requesterName: dto.requesterName,
        tenantId: dto.tenantId,
        createdById,
        status: SupportTicketStatus.OPEN,
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    return this.formatTicket(ticket);
  }

  async update(id: string, dto: UpdateSupportTicketDto) {
    const existing = await this.prisma.supportTicket.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Support ticket not found');

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    return this.formatTicket(ticket);
  }

  private formatTicket(
    ticket: Prisma.SupportTicketGetPayload<{
      include: {
        assignedTo: { select: { id: true; firstName: true; lastName: true; email: true } };
        tenant: { select: { id: true; name: true; slug: true } };
      };
    }>,
  ) {
    return {
      id: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
      status: ticket.status,
      requesterEmail: ticket.requesterEmail,
      requesterName: ticket.requesterName,
      assignedToId: ticket.assignedToId,
      assignedTo: ticket.assignedTo,
      tenantId: ticket.tenantId,
      tenant: ticket.tenant,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}
