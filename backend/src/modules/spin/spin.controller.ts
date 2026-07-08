import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SpinService } from './spin.service';

@ApiTags('spin')
@Controller('spin')
export class SpinController {
  constructor(private readonly spinService: SpinService) {}

  @Public()
  @Get('obcine')
  @ApiOperation({ summary: 'Seznam občin (SPIN) za nastavitev društva' })
  listObcine() {
    return this.spinService.listObcine();
  }

  @Get('interventions')
  @ApiOperation({ summary: 'Nedavne intervencije SPIN za občino društva' })
  recent(@CurrentUser('organizationId') organizationId: string) {
    return this.spinService.recentForOrg(organizationId);
  }
}
