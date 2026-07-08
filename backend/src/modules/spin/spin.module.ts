import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Organization } from '../organizations/organization.entity';
import { SpinController } from './spin.controller';
import { SpinIntervention } from './spin-intervention.entity';
import { SpinService } from './spin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpinIntervention, Organization]),
    NotificationsModule,
  ],
  controllers: [SpinController],
  providers: [SpinService],
  exports: [SpinService],
})
export class SpinModule {}
