import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { OptionalAuth, RequirePermissions, Roles } from '../common/decorators';
import { VenueQueryDto } from './dto/venue-query.dto';
import { VenuesService } from './venues.service';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private venuesService: VenuesService) {}

  @OptionalAuth()
  @Get()
  @ApiOperation({ summary: 'List bookable venues (grouped by partner tenant)' })
  @ApiResponse({ status: 200, description: 'Paginated venues' })
  findAll(@Query() query: VenueQueryDto) {
    return this.venuesService.findAll(query);
  }

  @Get('admin/list')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all venues with nested courts (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated venues with all courts' })
  findAllAdmin(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.venuesService.findAllAdmin({
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @OptionalAuth()
  @Get(':id/sports')
  @ApiOperation({ summary: 'List sports offered at a venue' })
  listSports(@Param('id') id: string) {
    return this.venuesService.listVenueSports(id);
  }

  @OptionalAuth()
  @Get(':id/sports/:sportSlug')
  @ApiOperation({ summary: 'Sport detail for a venue with courts and operating hours' })
  getSportDetail(@Param('id') id: string, @Param('sportSlug') sportSlug: string) {
    return this.venuesService.getVenueSportDetail(id, sportSlug);
  }

  @OptionalAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get venue details with bookable courts' })
  @ApiParam({ name: 'id', description: 'Tenant / venue UUID' })
  @ApiResponse({ status: 200, description: 'Venue with courts' })
  findOne(@Param('id') id: string, @Query('sportSlug') sportSlug?: string) {
    return this.venuesService.findOne(id, sportSlug);
  }
}
