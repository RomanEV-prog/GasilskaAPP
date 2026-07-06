import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import { CreateNotificationDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Moja obvestila' })
  findMine(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationsService.findMine(orgId, userId);
  }

  @Get('all')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT)
  @ApiOperation({ summary: 'Vsa obvestila društva' })
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.notificationsService.findAll(orgId);
  }

  @Post()
  @Roles(
    SystemRole.ORG_ADMIN,
    SystemRole.PRESIDENT,
    SystemRole.COMMANDER,
    SystemRole.SECRETARY,
  )
  @ApiOperation({ summary: 'Pošlji obvestilo' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(orgId, userId, dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Označi obvestilo kot prebrano' })
  markRead(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markRead(orgId, id, userId);
  }

  @Get(':id/reads')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT)
  @ApiOperation({ summary: 'Kdo je prebral obvestilo' })
  getReads(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.getReads(orgId, id);
  }
}
