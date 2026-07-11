import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { Permission, UserRole } from '@fitora/types';
import { PaymentEntityType, PaymentStatus } from '@prisma/client';
import { Public, RequirePermissions, Roles } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { MockCompletePaymentDto, RefundPaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Razorpay / mock payment config' })
  config() {
    return this.paymentsService.getConfig();
  }

  @Get('my')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'My payment history' })
  getMyPayments(
    @CurrentUser() user: AuthUserPayload,
    @Query('status') status?: PaymentStatus,
    @Query('entityType') entityType?: PaymentEntityType,
    @Query('page') page?: string,
  ) {
    return this.paymentsService.getMyPayments(user.id, {
      status,
      entityType,
      page: page ? Number(page) : undefined,
    });
  }

  @Get('invoices/my')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'My payment invoices' })
  getMyInvoices(@CurrentUser() user: AuthUserPayload) {
    return this.paymentsService.getMyInvoices(user.id);
  }

  @Get('admin/list')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Admin payment ledger' })
  adminList(
    @Query('status') status?: PaymentStatus,
    @Query('entityType') entityType?: PaymentEntityType,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.paymentsService.adminListPayments({
      status,
      entityType,
      search,
      page: page ? Number(page) : undefined,
    });
  }

  @Get('admin/reports')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Payment reports by entity type' })
  reports(@Query('days') days?: string) {
    return this.paymentsService.getPaymentReports({ days: days ? Number(days) : undefined });
  }

  @Get(':paymentId/invoice')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Get invoice for a payment' })
  getInvoice(@CurrentUser() user: AuthUserPayload, @Param('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentInvoice(paymentId, user);
  }

  @Get(':paymentId')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Payment detail' })
  getPayment(@CurrentUser() user: AuthUserPayload, @Param('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentById(paymentId, user);
  }

  @Post('verify')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Verify Razorpay payment and activate entity' })
  verify(@Body() dto: VerifyPaymentDto, @CurrentUser() user: AuthUserPayload) {
    return this.paymentsService.verifyPayment(
      user.id,
      dto.paymentId,
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
  }

  @Post('mock-complete')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Complete mock payment (dev mode)' })
  mockComplete(@Body() dto: MockCompletePaymentDto, @CurrentUser() user: AuthUserPayload) {
    return this.paymentsService.mockComplete(user.id, dto.paymentId);
  }

  @Post(':paymentId/refund')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.PAYMENTS_REFUND)
  @ApiOperation({ summary: 'Refund a payment via Razorpay' })
  refund(@Param('paymentId') paymentId: string, @Body() dto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(paymentId, dto.amount, dto.reason);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    return this.paymentsService.handleWebhook(signature, rawBody);
  }
}
