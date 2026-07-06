import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @ApiPropertyOptional({
    example: 'Zapisnik občnega zbora 2026',
    description: 'Če ni podano, se uporabi ime datoteke.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Zapisniki' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: true, description: 'Vidno vsem članom' })
  @IsOptional()
  // Beri surovo vrednost iz objekta — enableImplicitConversion sicer
  // pretvori vsak neprazen niz (tudi "false") v true.
  @Transform(({ obj }) => obj.isPublic === 'true' || obj.isPublic === true)
  @IsBoolean()
  isPublic?: boolean;
}

export class DocumentFileDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
