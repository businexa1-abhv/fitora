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
import { PrintOrderStatus } from '@prisma/client';
import { Public, RequirePermissions, Roles } from '../common/decorators';
import { AdminListQueryDto } from '../common/dto/admin-list-query.dto';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  ApproveDesignDto,
  CreatePrintListingDto,
  CreatePrintOrderDto,
  RejectDesignDto,
  UpdatePrintListingDto,
  UpdatePrintOrderStatusDto,
  UploadDesignDto,
} from './dto/print.dto';
import { PrintService } from './print.service';

@ApiTags('print')
@Controller('print')
export class PrintController {
  constructor(private printService: PrintService) {}

  @Public()
  @Get('options')
  @ApiOperation({ summary: 'T-shirt sizes and colors' })
  getOptions() {
    return this.printService.getOptions();
  }

  @Post('designs/upload')
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload design image' })
  uploadDesign(@CurrentUser() user: AuthUserPayload, @Body() dto: UploadDesignDto) {
    return this.printService.uploadDesign(user.id, dto);
  }

  @Get('designs/:designId')
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get uploaded design for preview' })
  getDesign(@CurrentUser() user: AuthUserPayload, @Param('designId') designId: string) {
    return this.printService.getDesign(designId, user);
  }

  @Public()
  @Get('listings')
  @ApiOperation({ summary: 'Browse print listings' })
  findListings(
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.printService.findListings({
      city,
      search,
      page: page ? Number(page) : undefined,
    });
  }

  @Public()
  @Get('listings/:id')
  @ApiOperation({ summary: 'Print listing detail' })
  findListing(@Param('id') id: string) {
    return this.printService.findListingById(id);
  }

  @Post('listings')
  @Roles(UserRole.PRINTER, UserRole.ADMIN)
  @RequirePermissions(Permission.PRINT_WRITE)
  @ApiBearerAuth('access-token')
  createListing(@CurrentUser() user: AuthUserPayload, @Body() dto: CreatePrintListingDto) {
    return this.printService.createListing(user, dto);
  }

  @Put('listings/:id')
  @Roles(UserRole.PRINTER, UserRole.ADMIN)
  @RequirePermissions(Permission.PRINT_WRITE)
  @ApiBearerAuth('access-token')
  updateListing(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdatePrintListingDto,
  ) {
    return this.printService.updateListing(id, user, dto);
  }

  @Get('listings/mine/all')
  @Roles(UserRole.PRINTER, UserRole.ADMIN)
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  getMyListings(@CurrentUser() user: AuthUserPayload) {
    return this.printService.getMyListings(user.id);
  }

  @Post('listings/:listingId/orders')
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Place print order and create payment' })
  createOrder(
    @CurrentUser() user: AuthUserPayload,
    @Param('listingId') listingId: string,
    @Body() dto: CreatePrintOrderDto,
  ) {
    return this.printService.createOrder(user.id, listingId, dto);
  }

  @Get('orders/my')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiBearerAuth('access-token')
  getMyOrders(@CurrentUser() user: AuthUserPayload) {
    return this.printService.getMyOrders(user.id);
  }

  @Get('orders/:orderId')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiBearerAuth('access-token')
  getOrder(@CurrentUser() user: AuthUserPayload, @Param('orderId') orderId: string) {
    return this.printService.getOrder(orderId, user);
  }

  @Post('orders/:orderId/approve-design')
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  approveDesign(
    @CurrentUser() user: AuthUserPayload,
    @Param('orderId') orderId: string,
    @Body() dto: ApproveDesignDto,
  ) {
    return this.printService.approveDesign(orderId, user.id, dto);
  }

  @Post('orders/:orderId/reject-design')
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  rejectDesign(
    @CurrentUser() user: AuthUserPayload,
    @Param('orderId') orderId: string,
    @Body() dto: RejectDesignDto,
  ) {
    return this.printService.rejectDesign(orderId, user.id, dto);
  }

  @Get('dashboard/printer')
  @Roles(UserRole.PRINTER, UserRole.ADMIN)
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  printerDashboard(@CurrentUser() user: AuthUserPayload) {
    return this.printService.getPrinterDashboard(user.id);
  }

  @Get('orders/provider/incoming')
  @Roles(UserRole.PRINTER, UserRole.ADMIN)
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  providerOrders(@CurrentUser() user: AuthUserPayload) {
    return this.printService.getProviderOrders(user.id);
  }

  @Patch('orders/:orderId/status')
  @Roles(UserRole.PRINTER, UserRole.ADMIN)
  @RequirePermissions(Permission.PRINT_WRITE)
  @ApiBearerAuth('access-token')
  updateStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdatePrintOrderStatusDto,
  ) {
    return this.printService.updateOrderStatus(orderId, user, dto);
  }

  @Get('orders/admin/list')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.PRINT_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: paginated print orders' })
  adminOrders(@Query() query: AdminListQueryDto) {
    return this.printService.adminListOrders({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status as PrintOrderStatus | undefined,
      sortOrder: query.sortOrder,
    });
  }
}
