import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import {
  type PartnerBusinessDto,
  type PartnerLegalDto,
  type PartnerSportsConfigDto,
  type PartnerSubmitDto,
  type PartnerTrainersDto,
  type PartnerVenueDto,
  type PartnerVerifyPhoneDto,
  type PartnerVisualsDto,
} from './dto/partner-onboarding.dto';
import { type PartnerOnboardingService } from './partner-onboarding.service';

@ApiTags('Partner Onboarding')
@Controller('partner/onboarding')
export class PartnerOnboardingController {
  constructor(private readonly partnerOnboardingService: PartnerOnboardingService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Start a new partner onboarding draft' })
  createDraft() {
    return this.partnerOnboardingService.createDraft();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get partner onboarding application' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerOnboardingService.getById(id);
  }

  @Public()
  @Patch(':id/business')
  @ApiOperation({ summary: 'Save business profile (step 1)' })
  saveBusiness(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerBusinessDto) {
    return this.partnerOnboardingService.saveBusiness(id, dto);
  }

  @Public()
  @Post(':id/otp/send')
  @ApiOperation({ summary: 'Send mobile OTP for partner registration' })
  sendOtp(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerOnboardingService.sendOtp(id);
  }

  @Public()
  @Post(':id/otp/verify')
  @ApiOperation({ summary: 'Verify mobile OTP for partner registration' })
  verifyPhone(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerVerifyPhoneDto) {
    return this.partnerOnboardingService.verifyPhone(id, dto);
  }

  @Public()
  @Patch(':id/venue')
  @ApiOperation({ summary: 'Save venue details (step 2)' })
  saveVenue(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerVenueDto) {
    return this.partnerOnboardingService.saveVenue(id, dto);
  }

  @Public()
  @Patch(':id/sports')
  @ApiOperation({ summary: 'Save sports and pricing configuration' })
  saveSports(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerSportsConfigDto) {
    return this.partnerOnboardingService.saveSports(id, dto);
  }

  @Public()
  @Patch(':id/trainers')
  @ApiOperation({ summary: 'Save trainer list (optional)' })
  saveTrainers(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerTrainersDto) {
    return this.partnerOnboardingService.saveTrainers(id, dto);
  }

  @Public()
  @Patch(':id/legal')
  @ApiOperation({ summary: 'Save legal and banking details (step 3)' })
  saveLegal(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerLegalDto) {
    return this.partnerOnboardingService.saveLegal(id, dto);
  }

  @Public()
  @Patch(':id/visuals')
  @ApiOperation({ summary: 'Save visuals and terms acceptance (step 4)' })
  saveVisuals(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerVisualsDto) {
    return this.partnerOnboardingService.saveVisuals(id, dto);
  }

  @Public()
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit partner application and provision tenant/courts' })
  submit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerSubmitDto) {
    return this.partnerOnboardingService.submit(id, dto ?? {});
  }
}
