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

  @Get('settings')
  @ApiOperation({
    summary: 'Občina društva (mobilni prikaz bere SPIN neposredno)',
  })
  settings(@CurrentUser('organizationId') organizationId: string) {
    return this.spinService.obcinaForOrg(organizationId);
  }
}
