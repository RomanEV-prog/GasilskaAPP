import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { EquipmentCondition } from '../equipment.entity';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Izolirni dihalni aparat' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Zaščitna oprema' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'IDA-001' })
  @IsOptional()
  @IsString()
  inventoryNumber?: string;

  @ApiPropertyOptional({ example: 'Garaža — omara 3' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'uuid vozila' })
  @IsOptional()
  @IsUUID('4', { message: 'Neveljaven ID vozila.' })
  vehicleId?: string;

  @ApiPropertyOptional({
    enum: EquipmentCondition,
    default: EquipmentCondition.GOOD,
  })
  @IsOptional()
  @IsEnum(EquipmentCondition, { message: 'Neveljavno stanje opreme.' })
  condition?: EquipmentCondition;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum zadnjega pregleda.' })
  lastInspection?: string;

  @ApiPropertyOptional({ example: '2027-01-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum naslednjega pregleda.' })
  nextInspection?: string;

  @ApiPropertyOptional({
    example: '2030-06-01',
    description: 'Rok veljave/trajanja opreme',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven rok veljave.' })
  expiryDate?: string;

  @ApiPropertyOptional({
    example: '2021-03-20',
    description: 'Datum nabave — podlaga za starost opreme',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum nabave.' })
  purchaseDate?: string;

  @ApiPropertyOptional({
    example: '04A2B3C4D5E680',
    description:
      'Strojni UID NFC oznake (hex, ločila neobvezna); `null` odklopi oznako',
  })
  @IsOptional()
  @ValidateIf((o: CreateEquipmentDto) => o.nfcUid !== null)
  // Ločila (presledek, dvopičje, vezaj) so dovoljena — servis jih odstrani.
  // Mobilna pošlje čist hex, ročni vnos pa je pogosto v obliki 04:1F:2E:…
  @Matches(/^[0-9A-Fa-f]{2}(?:[\s:-]?[0-9A-Fa-f]{2}){3,9}$/, {
    message: 'Neveljaven UID NFC oznake.',
  })
  nfcUid?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryEquipmentDto {
  @ApiPropertyOptional({ example: 'Zaščitna oprema' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: EquipmentCondition })
  @IsOptional()
  @IsEnum(EquipmentCondition)
  condition?: EquipmentCondition;

  @ApiPropertyOptional({ example: 'uuid vozila' })
  @IsOptional()
  @IsUUID('4')
  vehicleId?: string;
}

export class InspectionsQueryDto {
  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
