import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CreateExpenseDto, ExpenseResponseDto, UpdateExpenseDto } from './dto/venue-ops.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('venue-ops')
@ApiBearerAuth('access-token')
@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'List tenant expenses' })
  @ApiResponse({ status: 200, type: [ExpenseResponseDto] })
  list(@CurrentUser() user: AuthUserPayload) {
    return this.expensesService.list(user);
  }

  @Get(':id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Get expense by id' })
  @ApiResponse({ status: 200, type: ExpenseResponseDto })
  getById(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.expensesService.getById(id, user);
  }

  @Post()
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Create expense' })
  @ApiResponse({ status: 201, type: ExpenseResponseDto })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUserPayload) {
    return this.expensesService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Update expense' })
  @ApiResponse({ status: 200, type: ExpenseResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.expensesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Soft-delete expense' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.expensesService.remove(id, user);
  }
}
