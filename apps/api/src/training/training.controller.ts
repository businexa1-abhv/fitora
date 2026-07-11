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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { Public, Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  AssignTrainerDto,
  CreateBatchDto,
  CreateKidDto,
  CreateProgramDto,
  CreateProgressReportDto,
  EnrollKidDto,
  EnrollWithKidDto,
  MarkAttendanceDto,
  MarkBatchAttendanceDto,
  ParentDashboardDto,
  TrainerDashboardDto,
  UpdateBatchDto,
  UpdateKidDto,
  UpdateProgramDto,
} from './dto/training.dto';
import { TrainingService } from './training.service';

@ApiTags('training')
@Controller()
export class TrainingController {
  constructor(private trainingService: TrainingService) {}

  // ─── Public / discovery ─────────────────────────────────────────────────────

  @Public()
  @Get('training/age-groups')
  @ApiOperation({ summary: 'Predefined age group presets' })
  getAgeGroups() {
    return this.trainingService.getAgeGroupPresets();
  }

  @Public()
  @Get('training/trainers')
  @ApiOperation({ summary: 'List available trainers' })
  getTrainers() {
    return this.trainingService.getTrainers();
  }

  @Public()
  @Get('training/programs')
  @ApiOperation({ summary: 'List training programs with batches' })
  getPrograms(@Query('courtId') courtId?: string) {
    return this.trainingService.getPrograms(courtId);
  }

  @Get('training/programs/:programId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get program details' })
  getProgram(@Param('programId') programId: string) {
    return this.trainingService.getProgram(programId);
  }

  // ─── Owner program & batch management ───────────────────────────────────────

  @Post('courts/:courtId/training/programs')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create kids training program with age group' })
  createProgram(
    @Param('courtId') courtId: string,
    @Body() dto: CreateProgramDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.createProgram(courtId, dto, user);
  }

  @Put('training/programs/:programId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  updateProgram(
    @Param('programId') programId: string,
    @Body() dto: UpdateProgramDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.updateProgram(programId, dto, user);
  }

  @Delete('training/programs/:programId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  deleteProgram(@Param('programId') programId: string, @CurrentUser() user: AuthUserPayload) {
    return this.trainingService.deleteProgram(programId, user);
  }

  @Post('training/programs/:programId/batches')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create batch and assign trainer' })
  createBatch(
    @Param('programId') programId: string,
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.createBatch(programId, dto, user);
  }

  @Put('training/batches/:batchId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  updateBatch(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.updateBatch(batchId, dto, user);
  }

  @Patch('training/batches/:batchId/trainer')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reassign trainer to batch' })
  assignTrainer(
    @Param('batchId') batchId: string,
    @Body() dto: AssignTrainerDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.assignTrainer(batchId, dto, user);
  }

  @Get('training/dashboard/owner')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Owner training dashboard' })
  ownerDashboard(@CurrentUser() user: AuthUserPayload) {
    return this.trainingService.getOwnerDashboard(user);
  }

  // ─── Parent registration & enrollment ───────────────────────────────────────

  @Get('training/dashboard/parent')
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Parent dashboard — kids, attendance, reports' })
  @ApiResponse({ status: 200, type: ParentDashboardDto })
  parentDashboard(@CurrentUser() user: AuthUserPayload) {
    return this.trainingService.getParentDashboard(user.id);
  }

  @Get('training/kids/mine')
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'My kids profiles and enrollments' })
  getMyKids(@CurrentUser() user: AuthUserPayload) {
    return this.trainingService.getMyKids(user.id);
  }

  @Post('training/kids')
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Register kid profile (medical + emergency contact)' })
  createKid(@Body() dto: CreateKidDto, @CurrentUser() user: AuthUserPayload) {
    return this.trainingService.createKid(dto, user.id);
  }

  @Put('training/kids/:kidId')
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  updateKid(
    @Param('kidId') kidId: string,
    @Body() dto: UpdateKidDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.updateKid(kidId, dto, user.id);
  }

  @Post('training/enroll')
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enroll existing kid → payment order' })
  enroll(@Body() dto: EnrollKidDto, @CurrentUser() user: AuthUserPayload) {
    return this.trainingService.enroll(dto, user.id);
  }

  @Post('training/enroll/new')
  @RequirePermissions(Permission.TRAINING_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Registration form — create kid + enroll + pay' })
  enrollNew(@Body() dto: EnrollWithKidDto, @CurrentUser() user: AuthUserPayload) {
    return this.trainingService.enrollWithNewKid(dto, user.id);
  }

  // ─── Trainer dashboard & attendance ───────────────────────────────────────

  @Get('training/dashboard/trainer')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Trainer dashboard' })
  @ApiResponse({ status: 200, type: TrainerDashboardDto })
  trainerDashboard(@CurrentUser() user: AuthUserPayload) {
    return this.trainingService.getTrainerDashboard(user.id);
  }

  @Get('training/batches/mine')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Trainer: my batches with enrolled kids' })
  getTrainerBatches(@CurrentUser() user: AuthUserPayload) {
    return this.trainingService.getTrainerBatches(user.id);
  }

  @Post('training/batches/:batchId/attendance')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.ATTENDANCE_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Bulk mark attendance for a batch on a date' })
  markBatchAttendance(
    @Param('batchId') batchId: string,
    @Body() dto: MarkBatchAttendanceDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.markBatchAttendance(batchId, dto, user);
  }

  @Post('training/enrollments/:enrollmentId/attendance')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.ATTENDANCE_WRITE)
  @ApiBearerAuth('access-token')
  markAttendance(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.markAttendance(enrollmentId, dto, user);
  }

  @Get('training/enrollments/:enrollmentId/attendance')
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Attendance history (parent/trainer/admin)' })
  getAttendance(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.getEnrollmentAttendance(enrollmentId, user);
  }

  // ─── Progress reports ───────────────────────────────────────────────────────

  @Post('training/progress-reports')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.PROGRESS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create progress report for a student' })
  createProgressReport(
    @Body() dto: CreateProgressReportDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.createProgressReport(dto, user);
  }

  @Patch('training/progress-reports/:reportId/publish')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.PROGRESS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Publish progress report to parent' })
  publishProgressReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.publishProgressReport(reportId, user);
  }

  @Get('training/enrollments/:enrollmentId/progress-reports')
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List progress reports (parents see published only)' })
  getProgressReports(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.trainingService.getProgressReports(enrollmentId, user);
  }
}
