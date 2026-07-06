import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { UploadDocumentDto } from './dto/document.dto';

/** Dovoljeni MIME tipi za MVP. */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadsRoot: string;

  constructor(
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    config: ConfigService,
  ) {
    this.uploadsRoot = config.get<string>(
      'UPLOADS_DIR',
      join(process.cwd(), 'uploads'),
    );
  }

  /** Shrani datoteko na disk (ločeno po organizacijah) in zapiše metapodatke. */
  async upload(
    organizationId: string,
    uploadedBy: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('Datoteka ni bila priložena.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Nepodprt tip datoteke.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Datoteka je prevelika (največ 10 MB).');
    }

    const orgDir = join(this.uploadsRoot, organizationId);
    await mkdir(orgDir, { recursive: true });

    // Naključno ime datoteke — originalno ime hranimo le v bazi.
    const fileName = `${randomUUID()}${extname(file.originalname)}`;
    const filePath = join(orgDir, fileName);
    await writeFile(filePath, file.buffer);

    const document = this.documentsRepo.create({
      organizationId,
      uploadedBy,
      name: dto.name || file.originalname,
      category: dto.category,
      fileUrl: filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      isPublic: dto.isPublic ?? true,
    });
    return this.documentsRepo.save(document);
  }

  /**
   * Seznam dokumentov. Navadni člani vidijo samo javne,
   * vodstvo (isLeadership=true) vse.
   */
  async findAll(
    organizationId: string,
    isLeadership: boolean,
  ): Promise<Document[]> {
    return this.documentsRepo.find({
      where: isLeadership
        ? { organizationId }
        : { organizationId, isPublic: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(organizationId: string, id: string): Promise<Document> {
    const document = await this.documentsRepo.findOne({
      where: { id, organizationId },
    });
    if (!document) {
      throw new NotFoundException('Dokument ni bil najden.');
    }
    return document;
  }

  /** Vrne stream datoteke za prenos (tenant preverjen v findOne). */
  async getFileStream(organizationId: string, id: string, isLeadership: boolean) {
    const document = await this.findOne(organizationId, id);
    if (!document.isPublic && !isLeadership) {
      throw new NotFoundException('Dokument ni bil najden.');
    }
    if (!existsSync(document.fileUrl)) {
      this.logger.error(`Datoteka manjka na disku: ${document.fileUrl}`);
      throw new NotFoundException('Datoteka ni več na voljo.');
    }
    return {
      stream: createReadStream(document.fileUrl),
      document,
    };
  }

  /** Izbriše dokument iz baze in datoteko z diska. */
  async remove(organizationId: string, id: string): Promise<void> {
    const document = await this.findOne(organizationId, id);
    await this.documentsRepo.remove(document);
    try {
      await unlink(document.fileUrl);
    } catch {
      this.logger.warn(`Datoteke ni bilo mogoče izbrisati: ${document.fileUrl}`);
    }
  }
}
