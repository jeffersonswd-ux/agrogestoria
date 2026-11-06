import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshDto } from './dto/auth.dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private meta(req: any) {
    return {
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    };
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, this.meta(req));
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: any) {
    return this.auth.refresh(dto.refreshToken, this.meta(req));
  }

  @ApiBearerAuth()
  @Post('logout')
  logout(@Body() dto: RefreshDto, @CurrentUser() user: AuthUser) {
    return this.auth.logout(dto?.refreshToken, user);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }
}
