import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunitySearchService } from './community-search.service';
import { SearchQueryDto } from './dto/community.dto';

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community/search')
export class CommunitySearchController {
  constructor(private readonly searchService: CommunitySearchService) {}

  @Get()
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'Search groups, players, venues, and sports' })
  search(@CurrentUser() user: AuthUserPayload, @Query() query: SearchQueryDto) {
    return this.searchService.search(user.id, query);
  }
}
