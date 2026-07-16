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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import {
  CreateUserDto,
  QueryUsersDto,
  UpdateAvailabilityDto,
  UpdateSpinNotificationsDto,
  UpdateUserDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam vseh članov društva' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: QueryUsersDto,
  ) {
    return this.usersService.findAll(orgId, query);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Pregled razpoložljivosti članov' })
  availability(@CurrentUser('organizationId') orgId: string) {
    return this.usersService.availabilityBreakdown(orgId);
  }

  @Get('available-operatives')
  @ApiOperation({ summary: 'Dosegljivi operativci' })
  availableOperatives(@CurrentUser('organizationId') orgId: string) {
    return this.usersService.availableOperatives(orgId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Moj profil' })
  findMe(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.usersService.findOne(orgId, userId);
  }

  @Patch('me/spin-notifications')
  @ApiOperation({ summary: 'Vklopi/izklopi moja SPIN obvestila' })
  updateMySpinNotifications(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSpinNotificationsDto,
  ) {
    return this.usersService.updateSpinNotifications(
      orgId,
      userId,
      dto.spinNotifications,
    );
  }

  @Patch('me/availability')
  @ApiOperation({ summary: 'Nastavi mojo razpoložljivost' })
  updateMyAvailability(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.usersService.updateAvailability(
      orgId,
      userId,
      dto.availability,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Profil člana' })
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(orgId, id);
  }

  @Post()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT, SystemRole.SECRETARY)
  @ApiOperation({ summary: 'Dodaj novega člana' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('roles') actorRoles: SystemRole[],
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(orgId, dto, actorRoles);
  }

  @Patch(':id')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT, SystemRole.SECRETARY)
  @ApiOperation({ summary: 'Uredi člana' })
  update(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('roles') actorRoles: SystemRole[],
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(orgId, id, dto, actorRoles);
  }

  @Delete(':id')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT)
  @ApiOperation({ summary: 'Deaktiviraj člana' })
  deactivate(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deactivate(orgId, id);
  }
}
