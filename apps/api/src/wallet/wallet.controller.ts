import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { CurrentUser, AuthUserPayload, RequirePermissions } from '../common/decorators';
import { WalletService } from './wallet.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';

@ApiTags('wallet')
@ApiBearerAuth('access-token')
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Get wallet balance and recent transactions' })
  getWallet(@CurrentUser() user: AuthUserPayload) {
    return this.walletService.getWallet(user.id);
  }

  @Get('transactions')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Paginated wallet transaction history' })
  listTransactions(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.walletService.listTransactions(
      user.id,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Post('topup')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Initiate wallet top-up payment' })
  topup(@CurrentUser() user: AuthUserPayload, @Body() dto: TopupWalletDto) {
    return this.walletService.initiateTopup(user.id, dto.amount);
  }
}
