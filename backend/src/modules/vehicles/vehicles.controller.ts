import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import {
  AddDriverDto,
  CreateEquipmentCheckDto,
  CreateVehicleDto,
  ExpiringQueryDto,
  UpdateVehicleDto,
} from './dto/vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam vozil' })
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.vehiclesService.findAll(orgId);
  }

  @Get('expiring')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST)
  @ApiOperation({ summary: 'Vozila s potekajočimi roki' })
  findExpiring(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: ExpiringQueryDto,
  ) {
    return this.vehiclesService.findExpiring(orgId, query.days ?? 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Podrobnosti vozila' })
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.findOne(orgId, id);
  }

  @Post()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST)
  @ApiOperation({ summary: 'Dodaj vozilo' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(orgId, dto);
  }

  @Patch(':id')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST)
  @ApiOperation({ summary: 'Uredi vozilo' })
  update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Deaktiviraj vozilo' })
  deactivate(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.deactivate(orgId, id);
  }

  @Post(':id/drivers')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST)
  @ApiOperation({ summary: 'Dodaj voznika' })
  addDriver(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDriverDto,
  ) {
    return this.vehiclesService.addDriver(orgId, id, dto);
  }

  @Delete(':id/drivers/:userId')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST)
  @ApiOperation({ summary: 'Odstrani voznika' })
  removeDriver(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.vehiclesService.removeDriver(orgId, id, userId);
  }

  @Get(':id/equipment')
  @ApiOperation({ summary: 'Oprema, ki domuje na vozilu' })
  equipmentOnVehicle(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.equipmentOnVehicle(orgId, id);
  }

  @Post(':id/equipment-check')
  @Roles(
    SystemRole.ORG_ADMIN,
    SystemRole.CHIEF_MACHINIST,
    SystemRole.TOOLKEEPER,
    SystemRole.ASSISTANT_BREATHING_APPARATUS,
  )
  @ApiOperation({ summary: 'Zabeleži inventuro opreme vozila' })
  createEquipmentCheck(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEquipmentCheckDto,
  ) {
    return this.vehiclesService.createEquipmentCheck(orgId, id, actorId, dto);
  }

  @Get(':id/equipment-checks')
  @Roles(
    SystemRole.ORG_ADMIN,
    SystemRole.CHIEF_MACHINIST,
    SystemRole.TOOLKEEPER,
    SystemRole.ASSISTANT_BREATHING_APPARATUS,
  )
  @ApiOperation({ summary: 'Zgodovina inventur opreme vozila' })
  equipmentChecks(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.equipmentChecks(orgId, id);
  }
}
