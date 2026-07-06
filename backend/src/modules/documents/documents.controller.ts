import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/roles.enum';
import { UploadDocumentDto } from './dto/document.dto';
import { DocumentsService } from './documents.service';

/** Vloge, ki vidijo tudi ne-javne dokumente. */
const LEADERSHIP: string[] = [
  SystemRole.ORG_ADMIN,
  SystemRole.PRESIDENT,
  SystemRole.COMMANDER,
  SystemRole.SECRETARY,
  SystemRole.TREASURER,
];

function isLeadership(user: AuthUser): boolean {
  return user.roles.some((r) => LEADERSHIP.includes(r));
}

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam dokumentov' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.documentsService.findAll(
      user.organizationId,
      isLeadership(user),
    );
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Prenesi dokument' })
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, document } = await this.documentsService.getFileStream(
      user.organizationId,
      id,
      isLeadership(user),
    );
    res.set({
      'Content-Type': document.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.name)}"`,
    });
    return new StreamableFile(stream);
  }

  @Post()
  @Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT, SystemRole.SECRETARY)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        category: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Naloži dokument' })
  upload(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documentsService.upload(orgId, userId, file, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Izbriši dokument' })
  remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.remove(orgId, id);
  }
}
