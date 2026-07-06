import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Repository } from 'typeorm';
import { UpdateOrganizationDto } from './dto/organization.dto';
import { Organization } from './organization.entity';

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

@Injectable()
export class OrganizationsService {
  private readonly uploadsRoot: string;

  constructor(
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    config: ConfigService,
  ) {
    this.uploadsRoot = config.get<string>(
      'UPLOADS_DIR',
      join(process.cwd(), 'uploads'),
    );
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.orgsRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException('Društvo ni bilo najdeno.');
    }
    return org;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const org = await this.findById(id);
    Object.assign(org, dto);
    return this.orgsRepo.save(org);
  }

  /** Shrani logotip društva (jpeg/png/svg, max 2 MB). */
  async uploadLogo(
    id: string,
    file: Express.Multer.File,
  ): Promise<Organization> {
    if (!file) {
      throw new BadRequestException('Datoteka ni bila priložena.');
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Logotip mora biti slika (JPEG, PNG ali SVG).',
      );
    }
    if (file.size > MAX_LOGO_SIZE) {
      throw new BadRequestException('Logotip je prevelik (največ 2 MB).');
    }

    const org = await this.findById(id);
    const orgDir = join(this.uploadsRoot, id);
    await mkdir(orgDir, { recursive: true });

    const fileName = `logo${extname(file.originalname) || '.png'}`;
    const filePath = join(orgDir, fileName);
    await writeFile(filePath, file.buffer);

    org.logoUrl = filePath;
    return this.orgsRepo.save(org);
  }

  /** Vrne stream logotipa za prikaz. */
  async getLogoStream(id: string) {
    const org = await this.findById(id);
    if (!org.logoUrl || !existsSync(org.logoUrl)) {
      throw new NotFoundException('Društvo nima naloženega logotipa.');
    }
    const ext = extname(org.logoUrl).toLowerCase();
    const mime =
      ext === '.svg'
        ? 'image/svg+xml'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'image/png';
    return { stream: createReadStream(org.logoUrl), mime };
  }
}
