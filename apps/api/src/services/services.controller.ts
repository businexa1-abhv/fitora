import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole } from '@fitora/types';
import { ServiceCategory, ServiceOrderStatus } from '@prisma/client';
import { Public, RequirePermissions, Roles } from '../common/decorators';
import { AdminListQueryDto } from '../common/dto/admin-list-query.dto';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  BookServiceDto,
  CreateServiceListingDto,
  CreateServiceReviewDto,
  UpdateServiceListingDto,
  UpdateServiceOrderStatusDto,
} from './dto/services.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Available service categories' })
  getCategories() {
    return this.servicesService.getCategories();
  }

  @Public()
  @Get('listings')
  @ApiOperation({ summary: 'Browse service listings' })
  findListings(
    @Query('category') category?: ServiceCategory,
    @Query('sportSlug') sportSlug?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.servicesService.findListings({
      category,
      sportSlug,
      city,
      search,
      page: page ? Number(page) : undefined,
    });
  }

  @Public()
  @Get('listings/:id')
  @ApiOperation({ summary: 'Service listing detail' })
  findListing(@Param('id') id: string) {
    return this.servicesService.findListingById(id);
  }

  @Public()
  @Get('listings/:id/reviews')
  @ApiOperation({ summary: 'Reviews for a listing' })
  getReviews(@Param('id') id: string) {
    return this.servicesService.getListingReviews(id);
  }

  @Post('listings')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_WRITE)
  @ApiBearerAuth('access-token')
  createListing(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateServiceListingDto) {
    return this.servicesService.createListing(user, dto);
  }

  @Put('listings/:id')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_WRITE)
  @ApiBearerAuth('access-token')
  updateListing(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateServiceListingDto,
  ) {
    return this.servicesService.updateListing(id, user, dto);
  }

  @Get('listings/mine/all')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_READ)
  @ApiBearerAuth('access-token')
  getMyListings(@CurrentUser() user: AuthUserPayload) {
    return this.servicesService.getMyListings(user.id);
  }

  @Post('listings/:listingId/book')
  @RequirePermissions(Permission.SERVICES_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Book a service and create payment' })
  bookService(
    @CurrentUser() user: AuthUserPayload,
    @Param('listingId') listingId: string,
    @Body() dto: BookServiceDto,
  ) {
    return this.servicesService.bookService(user.id, listingId, dto);
  }

  @Post('listings/:listingId/reviews')
  @RequirePermissions(Permission.SERVICES_READ)
  @ApiBearerAuth('access-token')
  createReview(
    @CurrentUser() user: AuthUserPayload,
    @Param('listingId') listingId: string,
    @Body() dto: CreateServiceReviewDto,
  ) {
    return this.servicesService.createReview(listingId, user.id, dto);
  }

  @Get('orders/my')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiBearerAuth('access-token')
  getMyOrders(@CurrentUser() user: AuthUserPayload) {
    return this.servicesService.getMyOrders(user.id);
  }

  @Get('orders/:orderId')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiBearerAuth('access-token')
  getOrder(@CurrentUser() user: AuthUserPayload, @Param('orderId') orderId: string) {
    return this.servicesService.getOrder(orderId, user);
  }

  @Get('dashboard/provider')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_READ)
  @ApiBearerAuth('access-token')
  providerDashboard(@CurrentUser() user: AuthUserPayload) {
    return this.servicesService.getProviderDashboard(user.id);
  }

  @Get('orders/provider/incoming')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_READ)
  @ApiBearerAuth('access-token')
  providerOrders(@CurrentUser() user: AuthUserPayload) {
    return this.servicesService.getProviderOrders(user.id);
  }

  @Patch('orders/:orderId/status')
  @Roles(UserRole.SERVICE_PROVIDER, UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_WRITE)
  @ApiBearerAuth('access-token')
  updateStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateServiceOrderStatusDto,
  ) {
    return this.servicesService.updateOrderStatus(orderId, user, dto);
  }

  @Get('listings/admin/all')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: paginated service listings' })
  adminListings(@Query() query: AdminListQueryDto) {
    return this.servicesService.adminListListings({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status as 'ACTIVE' | 'INACTIVE' | 'ALL' | undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('orders')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SERVICES_MANAGE)
  @ApiBearerAuth('access-token')
  getAllOrders(@Query() query: AdminListQueryDto) {
    return this.servicesService.adminListOrders({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status as ServiceOrderStatus | undefined,
      sortOrder: query.sortOrder,
    });
  }
}
