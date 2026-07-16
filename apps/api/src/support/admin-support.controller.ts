import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles, type AuthUserPayload } from '../common/decorators';
import {
  CreateSupportTicketDto,
  ListSupportTicketsQueryDto,
  UpdateSupportTicketDto,
} from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('Admin Support')
@ApiBearerAuth('access-token')
@Controller('admin/support/tickets')
@Roles(UserRole.ADMIN)
export class AdminSupportController {
  constructor(private supportService: SupportService) {}

  @Get()
  @ApiOperation({ summary: 'List support tickets' })
  list(@Query() query: ListSupportTicketsQueryDto) {
    return this.supportService.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create support ticket' })
  create(@Body() dto: CreateSupportTicketDto, @CurrentUser() user: AuthUserPayload) {
    return this.supportService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update support ticket status or assignment' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupportTicketDto) {
    return this.supportService.update(id, dto);
  }
}
