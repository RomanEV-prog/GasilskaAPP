import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentModule } from '../equipment/equipment.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Organization } from '../organizations/organization.entity';
import { Training } from '../trainings/training.entity';
import { TrainingsModule } from '../trainings/trainings.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Organization, Training]),
    VehiclesModule,
    TrainingsModule,
    EquipmentModule,
    EventsModule,
    NotificationsModule,
  ],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class SchedulerModule {}
