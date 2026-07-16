import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CreateSlotTypeDto, SlotTypeResponseDto, UpdateSlotTypeDto } from './dto/venue-ops.dto';
import { SlotTypesService } from './slot-types.service';

@ApiTags('venue-ops')
@ApiBearerAuth('access-token')
@Controller('slot-types')
export class SlotTypesController {
  constructor(private slotTypesService: SlotTypesService) {}

  @Get()
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiOperation({ summary: 'List slot type configs (seeds defaults if empty)' })
  @ApiResponse({ status: 200, type: [SlotTypeResponseDto] })
  list(@CurrentUser() user: AuthUserPayload) {
    return this.slotTypesService.list(user);
  }

  @Post()
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiOperation({ summary: 'Create slot type config' })
  @ApiResponse({ status: 201, type: SlotTypeResponseDto })
  create(@Body() dto: CreateSlotTypeDto, @CurrentUser() user: AuthUserPayload) {
    return this.slotTypesService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiOperation({ summary: 'Update slot type config' })
  @ApiResponse({ status: 200, type: SlotTypeResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSlotTypeDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotTypesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiOperation({ summary: 'Soft-delete slot type config' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.slotTypesService.remove(id, user);
  }
}
