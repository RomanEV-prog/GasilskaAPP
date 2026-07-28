import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import {
  CreateInvoiceDto,
  IssueCodesDto,
  MarkInvoicePaidDto,
  SetSubscriptionDto,
} from './dto/platform.dto';
import { InvoicesService } from './invoices.service';
import { PlatformService } from './platform.service';

/**
 * Upravljanje platforme — samo `super_admin`.
 *
 * Edini del sistema, ki namenoma seže čez meje tenanta: upravitelj platforme
 * vidi vsa društva in izdaja aktivacijske kode. Vsak endpoint je zato izrecno
 * omejen z `@Roles(SUPER_ADMIN)`.
 */
@ApiTags('platform')
@ApiBearerAuth()
@Roles(SystemRole.SUPER_ADMIN)
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Get('organizations')
  @ApiOperation({ summary: 'Vsa društva s stanjem naročnine' })
  listOrganizations() {
    return this.platformService.listOrganizations();
  }

  @Patch('organizations/:id/subscription')
  @ApiOperation({ summary: 'Ročno nastavi naročnino društva' })
  setSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSubscriptionDto,
  ) {
    return this.platformService.setSubscription(id, dto);
  }

  @Get('codes')
  @ApiOperation({ summary: 'Izdane aktivacijske kode' })
  listCodes() {
    return this.platformService.listCodes();
  }

  @Post('codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Izdaj nove aktivacijske kode' })
  issueCodes(
    @Body() dto: IssueCodesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.platformService.issueCodes(dto, userId);
  }

  @Post('codes/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prekliči neporabljeno kodo' })
  revokeCode(@Param('id', ParseUUIDPipe) id: string) {
    return this.platformService.revokeCode(id);
  }

  // ─── Računi ──────────────────────────────────────────────────────────

  @Get('issuer')
  @ApiOperation({ summary: 'Podatki izdajatelja računov (+ kaj manjka)' })
  getIssuer() {
    return this.invoicesService.getIssuer();
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Izdani računi' })
  listInvoices() {
    return this.invoicesService.list();
  }

  @Get('invoices/summary')
  @ApiOperation({ summary: 'Odprt dolg in število zapadlih računov' })
  invoicesSummary() {
    return this.invoicesService.summary();
  }

  // Za ":id" mora pot "summary" stati prej, sicer jo prestreže ParseUUIDPipe.
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Račun s podatki društva in izdajatelja' })
  getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Izdaj račun za naročnino' })
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invoicesService.create(dto, userId);
  }

  @Post('invoices/:id/paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Označi plačilo (privzeto podaljša naročnino društva)',
  })
  markInvoicePaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkInvoicePaidDto,
  ) {
    return this.invoicesService.markPaid(id, dto);
  }

  @Post('invoices/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Storniraj neplačan račun' })
  cancelInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.cancel(id);
  }
}
