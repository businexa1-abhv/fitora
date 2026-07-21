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
  @Get(':id')
  @ApiOperation({ summary: 'Get venue details with bookable courts' })
  @ApiParam({ name: 'id', description: 'Tenant / venue UUID' })
  @ApiResponse({ status: 200, description: 'Venue with courts' })
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }
}
