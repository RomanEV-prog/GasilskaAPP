import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationCode } from '../auth/registration-code.entity';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { PlatformInvoice } from './invoice.entity';
import { InvoicesService } from './invoices.service';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      RegistrationCode,
      User,
      PlatformInvoice,
    ]),
  ],
  controllers: [PlatformController],
  providers: [PlatformService, InvoicesService],
  // AuthModule (izdaja z master ključem) in OrganizationsModule (podaljšanje)
  // uporabljata isti servis, da je logika kod na enem mestu.
  exports: [PlatformService],
})
export class PlatformModule {}
