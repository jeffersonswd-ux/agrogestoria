import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AuthUser, CurrentUser, RequireModule } from '../common/decorators';

@ApiTags('Assistente IA')
@ApiBearerAuth()
@RequireModule('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() body: { question: string }) {
    return this.service.ask(user, body?.question);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.service.history(user);
  }

  @Get('status')
  status() {
    return { configured: !!process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
  }
}
