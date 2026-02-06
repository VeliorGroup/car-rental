import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'superadmin-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
  exports: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
