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
  CreateEventDto,
  MarkAttendanceDto,
  QueryEventsDto,
  RsvpDto,
  UpdateEventDto,
} from './dto/event.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam dogodkov (z mojim odzivom)' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryEventsDto,
  ) {
    return this.eventsService.findAllWithMyRsvp(orgId, query, userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Prihajajoči dogodki (za dashboard)' })
  findUpcoming(@CurrentUser('organizationId') orgId: string) {
    return this.eventsService.findUpcoming(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Podrobnosti dogodka (z mojim odzivom)' })
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.findOneWithMyRsvp(orgId, id, userId);
  }

  @Post()
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Ustvari dogodek' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(orgId, userId, dto);
  }

  @Patch(':id')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Uredi dogodek' })
  update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(orgId, id, dto);
  }

  @Patch(':id/cancel')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Odpovej dogodek' })
  cancel(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.cancel(orgId, id);
  }

  @Delete(':id')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Izbriši dogodek (samo pretekle ali odpovedane)' })
  remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.remove(orgId, id);
  }

  @Post(':id/rsvp')
  @ApiOperation({ summary: 'Potrdi udeležbo' })
  rsvp(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RsvpDto,
  ) {
    return this.eventsService.rsvp(orgId, id, userId, dto);
  }

  @Get(':id/rsvps')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Odzivi na dogodek' })
  getRsvps(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.getRsvps(orgId, id);
  }

  @Post(':id/attendance')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Označi prisotnost' })
  markAttendance(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.eventsService.markAttendance(orgId, id, userId, dto);
  }
}
