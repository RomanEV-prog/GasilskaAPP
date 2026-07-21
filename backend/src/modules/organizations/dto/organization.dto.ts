import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    description:
      'Zunanja povezava za fotografije (Google Foto / OneDrive album). Prazen niz = izbris.',
  })
  @IsOptional()
  @IsString()
  // Prazen niz (izbris) preskoči; sicer MORA biti http(s) URL — vrednost se
  // izriše kot klikljiva povezava (splet <a href>, mobilna launchUrl), zato
  // preprečimo sheme kot javascript:/data: (shranjeni XSS / zloraba).
  @ValidateIf((o) => o.photoUploadLink !== '' && o.photoUploadLink != null)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Povezava za fotografije mora biti veljaven http(s) naslov.' },
  )
  photoUploadLink?: string;

  @ApiPropertyOptional({
    description: 'Občine za obveščanje o intervencijah SPIN (seznam imen). Prazen seznam = brez obveščanja.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spinObcine?: string[];
}
