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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole } from '@fitora/types';
import { RequirePermissions, Roles } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  BatchAttendanceQueryDto,
  CreateLeaveRequestDto,
  CreateTrainingNoteDto,
  ListTrainingNotesQueryDto,
  ReviewLeaveRequestDto,
  UpdateTrainerProfileDto,
  UpdateTrainingNoteDto,
} from './dto/trainer.dto';
import { TrainersService } from './trainers.service';

@ApiTags('trainers')
@ApiBearerAuth('access-token')
@Controller('trainers')
export class TrainersController {
  constructor(private trainersService: TrainersService) {}

  @Get('me/profile')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Get trainer profile' })
  getProfile(@CurrentUser() user: AuthUserPayload) {
    return this.trainersService.getOrCreateProfile(user.id);
  }

  @Put('me/profile')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Update trainer profile' })
  updateProfile(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateTrainerProfileDto) {
    return this.trainersService.updateProfile(user.id, dto);
  }

  @Get('me/schedule')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Trainer weekly schedule from assigned batches' })
  getSchedule(@CurrentUser() user: AuthUserPayload) {
    return this.trainersService.getSchedule(user.id);
  }

  @Get('me/performance')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Trainer performance metrics' })
  getPerformance(@CurrentUser() user: AuthUserPayload) {
    return this.trainersService.getPerformance(user.id);
  }

  @Get('me/notes')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'List training notes' })
  listNotes(@CurrentUser() user: AuthUserPayload, @Query() query: ListTrainingNotesQueryDto) {
    return this.trainersService.listNotes(user.id, query);
  }

  @Post('me/notes')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Create training note' })
  createNote(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateTrainingNoteDto) {
    return this.trainersService.createNote(user.id, dto);
  }

  @Put('me/notes/:noteId')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Update training note' })
  updateNote(
    @CurrentUser() user: AuthUserPayload,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateTrainingNoteDto,
  ) {
    return this.trainersService.updateNote(user.id, noteId, dto);
  }

  @Delete('me/notes/:noteId')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Delete training note' })
  deleteNote(@CurrentUser() user: AuthUserPayload, @Param('noteId') noteId: string) {
    return this.trainersService.deleteNote(user.id, noteId);
  }

  @Post('me/leave-requests')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Submit leave request' })
  createLeave(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateLeaveRequestDto) {
    return this.trainersService.createLeaveRequest(user.id, dto);
  }

  @Get('me/leave-requests')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'List my leave requests' })
  listMyLeave(@CurrentUser() user: AuthUserPayload) {
    return this.trainersService.listMyLeaveRequests(user.id);
  }

  @Delete('me/leave-requests/:leaveId')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Cancel pending leave request' })
  cancelLeave(@CurrentUser() user: AuthUserPayload, @Param('leaveId') leaveId: string) {
    return this.trainersService.cancelLeaveRequest(user.id, leaveId);
  }

  @Get('batches/:batchId/attendance')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_READ)
  @ApiOperation({ summary: 'Preload batch attendance for a date' })
  batchAttendance(
    @CurrentUser() user: AuthUserPayload,
    @Param('batchId') batchId: string,
    @Query() query: BatchAttendanceQueryDto,
  ) {
    return this.trainersService.getBatchAttendanceForDate(user.id, batchId, query.date);
  }

  @Get('leave-requests')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_MANAGE)
  @ApiOperation({ summary: 'Owner: leave requests from assigned trainers' })
  listLeaveForOwner(@CurrentUser() user: AuthUserPayload) {
    return this.trainersService.listLeaveRequestsForOwner(user);
  }

  @Patch('leave-requests/:leaveId/review')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.TRAINING_MANAGE)
  @ApiOperation({ summary: 'Owner: approve or reject leave request' })
  reviewLeave(
    @CurrentUser() user: AuthUserPayload,
    @Param('leaveId') leaveId: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.trainersService.reviewLeaveRequest(leaveId, dto, user);
  }
}
