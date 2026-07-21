import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '../common/decorators';
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
