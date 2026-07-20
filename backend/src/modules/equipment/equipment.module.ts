import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { EquipmentAssignment } from './equipment-assignment.entity';
import { Equipment } from './equipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Equipment,
      Organization,
      EquipmentAssignment,
      User,
    ]),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
