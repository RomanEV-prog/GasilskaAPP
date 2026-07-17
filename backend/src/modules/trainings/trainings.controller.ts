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
  CreateTrainingDto,
  ExpiringTrainingsQueryDto,
  UpdateTrainingDto,
} from './dto/training.dto';
import { TrainingsService } from './trainings.service';

@ApiTags('trainings')
@ApiBearerAuth()
@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Get()
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Vsa usposabljanja društva' })
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.trainingsService.findAll(orgId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Moja usposabljanja' })
  findMine(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.trainingsService.findByUser(orgId, userId);
  }

  @Get('expiring')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Potekajoča usposabljanja' })
  findExpiring(
    @CurrentUser('organizationId') orgId: string,
    @Query() query: ExpiringTrainingsQueryDto,
  ) {
    return this.trainingsService.findExpiring(orgId, query.days ?? 60);
  }

  @Get('user/:userId')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Usposabljanja člana' })
  findByUser(
    @CurrentUser('organizationId') orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.trainingsService.findByUser(orgId, userId);
  }

  @Post()
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Dodaj usposabljanje' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateTrainingDto,
  ) {
    return this.trainingsService.create(orgId, dto);
  }

  @Patch(':id')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Uredi usposabljanje' })
  update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingDto,
  ) {
    return this.trainingsService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Izbriši usposabljanje' })
  remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainingsService.remove(orgId, id);
  }
}
