import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import { UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Podatki o mojem društvu' })
  getMine(@CurrentUser('organizationId') orgId: string) {
    return this.organizationsService.findById(orgId);
  }

  @Patch('me')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT)
  @ApiOperation({ summary: 'Uredi podatke društva' })
  updateMine(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(orgId, dto);
  }

  @Post('me/logo')
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT)
  @UseInterceptors(
    FileInterceptor('file', {
      // Logotip: največ 2 MB, ena datoteka (prepreči izčrpanje pomnilnika).
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Naloži logotip društva' })
  uploadLogo(
    @CurrentUser('organizationId') orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.organizationsService.uploadLogo(orgId, file);
  }

  @Get('me/logo')
  @ApiOperation({ summary: 'Logotip društva' })
  async getLogo(
    @CurrentUser('organizationId') orgId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mime } =
      await this.organizationsService.getLogoStream(orgId);
    res.set({ 'Content-Type': mime });
    return new StreamableFile(stream);
  }
}
