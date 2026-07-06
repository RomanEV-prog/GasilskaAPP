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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import {
  CreateEquipmentDto,
  InspectionsQueryDto,
  QueryEquipmentDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';
import { EquipmentService } from './equipment.service';

@ApiTags('equipment')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seznam opreme' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: QueryEquipmentDto,
  ) {
    return this.equipmentService.findAll(orgId, query);
  }

  @Get('inspections-due')
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.COMMANDER)
  @ApiOperation({ summary: 'Oprema s pregledom v naslednjih N dneh' })
  findInspectionsDue(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: InspectionsQueryDto,
  ) {
    return this.equipmentService.findInspectionsDue(orgId, query.days ?? 30);
  }

  /** Javno — QR skeniranje brez prijave (po MODULES.md spec). */
  @Public()
  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Podatki o opremi preko QR kode (javno)' })
  findByQrCode(@Param('qrCode') qrCode: string) {
    return this.equipmentService.findByQrCode(qrCode);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Podrobnosti opreme' })
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.equipmentService.findOne(orgId, id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.COMMANDER)
  @ApiOperation({ summary: 'Dodaj opremo' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateEquipmentDto,
  ) {
    return this.equipmentService.create(orgId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.COMMANDER)
  @ApiOperation({ summary: 'Uredi opremo' })
  update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(orgId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Deaktiviraj opremo' })
  deactivate(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.equipmentService.deactivate(orgId, id);
  }
}
