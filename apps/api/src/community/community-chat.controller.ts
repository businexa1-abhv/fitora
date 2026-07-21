import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunityChatService } from './community-chat.service';
import {
  MessagesQueryDto,
  ReactMessageDto,
  ReactQueryDto,
  SendMessageDto,
} from './dto/community.dto';

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community')
export class CommunityChatController {
  constructor(private readonly chat: CommunityChatService) {}

  @Get('groups/:groupId/messages')
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'List group chat messages' })
  listMessages(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.chat.listMessages(user.id, groupId, query);
  }

  @Post('groups/:groupId/messages')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Send a group message' })
  sendMessage(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(user.id, groupId, dto);
  }

  @Post('messages/:messageId/react')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  react(
    @CurrentUser() user: AuthUserPayload,
    @Param('messageId') messageId: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.chat.react(user.id, messageId, dto.emoji);
  }

  @Delete('messages/:messageId/react')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  unreact(
    @CurrentUser() user: AuthUserPayload,
    @Param('messageId') messageId: string,
    @Query() query: ReactQueryDto,
  ) {
    return this.chat.unreact(user.id, messageId, query.emoji);
  }

  @Post('messages/:messageId/pin')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  pin(@CurrentUser() user: AuthUserPayload, @Param('messageId') messageId: string) {
    return this.chat.pinMessage(user.id, messageId);
  }

  @Delete('messages/:messageId')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  deleteMessage(@CurrentUser() user: AuthUserPayload, @Param('messageId') messageId: string) {
    return this.chat.deleteMessage(user.id, messageId);
  }

  @Post('messages/:messageId/read')
  @RequirePermissions(Permission.COMMUNITY_READ)
  markRead(@CurrentUser() user: AuthUserPayload, @Param('messageId') messageId: string) {
    return this.chat.markRead(user.id, messageId);
  }
}
