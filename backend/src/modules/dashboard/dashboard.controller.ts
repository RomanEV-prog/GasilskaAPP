import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(
    SystemRole.ORG_ADMIN,
    SystemRole.PRESIDENT,
    SystemRole.COMMANDER,
    SystemRole.DEPUTY_COMMANDER,
    SystemRole.SECRETARY,
  )
  @ApiOperation({ summary: 'Dashboard za vodstvo' })
  adminDashboard(@CurrentUser('organizationId') orgId: string) {
    return this.dashboardService.adminDashboard(orgId);
  }

  @Get('member')
  @ApiOperation({ summary: 'Dashboard za člana' })
  memberDashboard(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dashboardService.memberDashboard(orgId, userId);
  }
}
