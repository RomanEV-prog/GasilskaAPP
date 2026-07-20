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
  IssueEquipmentDto,
  ReturnEquipmentDto,
} from './dto/equipment-assignment.dto';
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
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST, SystemRole.TOOLKEEPER, SystemRole.ASSISTANT_BREATHING_APPARATUS)
  @ApiOperation({ summary: 'Oprema s pregledom v naslednjih N dneh' })
  findInspectionsDue(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: InspectionsQueryDto,
  ) {
    return this.equipmentService.findInspectionsDue(orgId, query.days ?? 30);
  }

  /**
   * QR skeniranje — samo za prijavljene člane, omejeno na lastno društvo.
   * (Prej javno: omogočalo je anonimno naštevanje in razkritje podatkov vozila
   * drugih društev — glej varnostni pregled.)
   */
  @Get('qr/:qrCode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Podatki o opremi preko QR kode' })
  findByQrCode(
    @CurrentUser('organizationId') orgId: string,
    @Param('qrCode') qrCode: string,
  ) {
    return this.equipmentService.findByQrCode(orgId, qrCode);
  }

  /** NFC skeniranje — zrcali QR pot. Mora biti pred `:id` (ParseUUIDPipe). */
  @Get('nfc/:uid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Podatki o opremi preko NFC oznake' })
  findByNfcUid(
    @CurrentUser('organizationId') orgId: string,
    @Param('uid') uid: string,
  ) {
    return this.equipmentService.findByNfcUid(orgId, uid);
  }

  /** Moja zadolžena oprema — vsak prijavljen član vidi svoje. */
  @Get('my-assignments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moja zadolžena oprema' })
  myAssignments(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.equipmentService.myAssignments(orgId, userId);
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
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST, SystemRole.TOOLKEEPER, SystemRole.ASSISTANT_BREATHING_APPARATUS)
  @ApiOperation({ summary: 'Dodaj opremo' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateEquipmentDto,
  ) {
    return this.equipmentService.create(orgId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST, SystemRole.TOOLKEEPER, SystemRole.ASSISTANT_BREATHING_APPARATUS)
  @ApiOperation({ summary: 'Uredi opremo' })
  update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(orgId, id, dto);
  }

  @Post(':id/assignments')
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST, SystemRole.TOOLKEEPER, SystemRole.ASSISTANT_BREATHING_APPARATUS)
  @ApiOperation({ summary: 'Zadolži opremo članu' })
  issue(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssueEquipmentDto,
  ) {
    return this.equipmentService.issue(orgId, id, actorId, dto);
  }

  @Post(':id/assignments/return')
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST, SystemRole.TOOLKEEPER, SystemRole.ASSISTANT_BREATHING_APPARATUS)
  @ApiOperation({ summary: 'Vrni zadolženo opremo' })
  returnItem(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnEquipmentDto,
  ) {
    return this.equipmentService.returnItem(orgId, id, actorId, dto);
  }

  @Get(':id/assignments')
  @ApiBearerAuth()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.CHIEF_MACHINIST, SystemRole.TOOLKEEPER, SystemRole.ASSISTANT_BREATHING_APPARATUS)
  @ApiOperation({ summary: 'Zgodovina zadolžitev opreme' })
  history(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.equipmentService.history(orgId, id);
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
