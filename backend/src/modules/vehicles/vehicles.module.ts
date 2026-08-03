import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from '../equipment/equipment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { VehicleDriver } from './vehicle-driver.entity';
import { VehicleEquipmentCheck } from './vehicle-equipment-check.entity';
import { Vehicle } from './vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vehicle,
      VehicleDriver,
      VehicleEquipmentCheck,
      Equipment,
    ]),
    NotificationsModule,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
