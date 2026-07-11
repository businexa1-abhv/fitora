import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { Roles, OptionalAuth, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CourtsService } from './courts.service';
import {
  AddCourtImageDto,
  CourtQueryDto,
  CourtResponseDto,
  CreateCourtDto,
  PaginatedCourtsResponseDto,
  RejectCourtDto,
  ResubmitCourtDto,
  UpdateCourtDto,
  UpdateCourtImageDto,
} from './dto';

@ApiTags('courts')
@Controller()
export class CourtsController {
  constructor(private courtsService: CourtsService) {}

  // ─── Reference data ─────────────────────────────────────────────────────────

  @Get('sports')
  @OptionalAuth()
  @ApiOperation({ summary: 'List available sports (court types)' })
  @ApiResponse({ status: 200, description: 'Sports list' })
  listSports() {
    return this.courtsService.listSports();
  }

  @Get('courts/amenities')
  @OptionalAuth()
  @ApiOperation({ summary: 'List valid court amenities' })
  getAmenities() {
    return this.courtsService.getAmenities();
  }

  // ─── Court CRUD ─────────────────────────────────────────────────────────────

  @OptionalAuth()
  @Get('courts')
  @ApiOperation({ summary: 'Search and list courts' })
  @ApiResponse({ status: 200, type: PaginatedCourtsResponseDto })
  findAll(@Query() query: CourtQueryDto, @CurrentUser() user?: AuthUserPayload) {
    return this.courtsService.findAll(query, user);
  }

  @Get('courts/pending')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_APPROVE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List courts pending approval (admin)' })
  @ApiResponse({ status: 200, type: PaginatedCourtsResponseDto })
  findPending(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.courtsService.findPending(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Get('courts/mine')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List courts owned by current user' })
  @ApiResponse({ status: 200, type: PaginatedCourtsResponseDto })
  findMine(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.courtsService.findMine(
      user.id,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @OptionalAuth()
  @Get('courts/:id')
  @ApiOperation({ summary: 'Get court details' })
  @ApiParam({ name: 'id', description: 'Court UUID' })
  @ApiResponse({ status: 200, type: CourtResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    return this.courtsService.findOne(id, user);
  }

  @Post('courts')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new court (pending approval)' })
  @ApiResponse({ status: 201, type: CourtResponseDto })
  create(@Body() dto: CreateCourtDto, @CurrentUser() user: AuthUserPayload) {
    return this.courtsService.create(dto, user.id);
  }

  @Put('courts/:id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a court' })
  @ApiResponse({ status: 200, type: CourtResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourtDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courtsService.update(id, dto, user);
  }

  @Delete('courts/:id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_DELETE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete a court' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.courtsService.remove(id, user);
  }

  // ─── Approval workflow ──────────────────────────────────────────────────────

  @Patch('courts/:id/approve')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_APPROVE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Approve a court (admin)' })
  @ApiResponse({ status: 200, type: CourtResponseDto })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.courtsService.approve(id, user.id);
  }

  @Patch('courts/:id/reject')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_APPROVE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reject a court with reason (admin)' })
  @ApiResponse({ status: 200, type: CourtResponseDto })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectCourtDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courtsService.reject(id, dto, user.id);
  }

  @Post('courts/:id/resubmit')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Resubmit a rejected court for approval' })
  @ApiResponse({ status: 200, type: CourtResponseDto })
  resubmit(
    @Param('id') id: string,
    @Body() dto: ResubmitCourtDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courtsService.resubmit(id, dto, user);
  }

  // ─── Images ─────────────────────────────────────────────────────────────────

  @Post('courts/:id/images')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add an image to a court' })
  addImage(
    @Param('id') id: string,
    @Body() dto: AddCourtImageDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courtsService.addImage(id, dto, user);
  }

  @Put('courts/:courtId/images/:imageId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a court image' })
  updateImage(
    @Param('courtId') courtId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateCourtImageDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courtsService.updateImage(courtId, imageId, dto, user);
  }

  @Delete('courts/:courtId/images/:imageId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove a court image' })
  removeImage(
    @Param('courtId') courtId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courtsService.removeImage(courtId, imageId, user);
  }

  @Patch('courts/:courtId/images/:imageId/primary')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Set image as primary' })
  setPrimaryImage(
    @Param('courtId') courtId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.courtsService.setPrimaryImage(courtId, imageId, user);
  }
}
