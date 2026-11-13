import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@RequireModule('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.service.status(user);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Post('connect')
  connect(@CurrentUser() user: AuthUser, @Body() body?: any) {
    // body opcional: o Fastify rejeita corpo vazio com content-type json,
    // e o painel envia `{}`; declarar @Body evita o 400 do parser.
    return this.service.createInstance(user);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Post('qr')
  qr(@CurrentUser() user: AuthUser, @Body() body?: any) {
    return this.service.connect(user);
  }

  @Get('refresh')
  refresh(@CurrentUser() user: AuthUser) {
    return this.service.refreshStatus(user);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Post('notifications')
  notifications(@CurrentUser() user: AuthUser, @Body() body: { enabled: boolean }) {
    return this.service.setNotifications(user, !!body.enabled);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Delete('disconnect')
  disconnect(@CurrentUser() user: AuthUser, @Query('delete') del?: string) {
    return this.service.disconnect(user, del === 'true');
  }

  @Get('messages')
  messages(@CurrentUser() user: AuthUser) {
    return this.service.messages(user);
  }
}
