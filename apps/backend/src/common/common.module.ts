import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ModulePermissionGuard } from './guards/module-permission.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ModulePermissionGuard },
  ],
  exports: [JwtModule],
})
export class CommonModule {}
