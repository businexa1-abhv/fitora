import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions, Roles } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  AddTenantTrainerDto,
  CreateTenantDto,
  ResolveTenantQueryDto,
  TenantListQueryDto,
  UpdateTenantBrandingDto,
  UpdateTenantDto,
  UpdateTenantPaymentsDto,
  UpdateTenantStatusDto,
} from './dto/tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('resolve')
  resolve(@Query() query: ResolveTenantQueryDto) {
    return this.tenantsService.resolve(query);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_READ)
  getMine(@CurrentUser() user: AuthUserPayload) {
    return this.tenantsService.getMine(user);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.TENANTS_MANAGE)
  list(@Query() query: TenantListQueryDto) {
    return this.tenantsService.listForAdmin(query);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_READ)
  getById(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.tenantsService.getById(id, user);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.TENANTS_MANAGE)
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: AuthUserPayload) {
    return this.tenantsService.create(dto, user);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tenantsService.update(id, dto, user);
  }

  @Patch(':id/branding')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_WRITE)
  updateBranding(
    @Param('id') id: string,
    @Body() dto: UpdateTenantBrandingDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tenantsService.updateBranding(id, dto, user);
  }

  @Patch(':id/payments')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_WRITE)
  updatePayments(
    @Param('id') id: string,
    @Body() dto: UpdateTenantPaymentsDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tenantsService.updatePayments(id, dto, user);
  }

  @Patch(':id/status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.TENANTS_MANAGE)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tenantsService.updateStatus(id, dto, user);
  }

  @Get(':id/trainers')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_READ)
  listTrainers(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.tenantsService.listTrainers(id, user);
  }

  @Post(':id/trainers')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_WRITE)
  addTrainer(
    @Param('id') id: string,
    @Body() dto: AddTenantTrainerDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tenantsService.addTrainer(id, dto.userId, user);
  }

  @Delete(':id/trainers/:userId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.COURT_OWNER)
  @RequirePermissions(Permission.TENANTS_WRITE)
  removeTrainer(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.tenantsService.removeTrainer(id, userId, user);
  }
}
