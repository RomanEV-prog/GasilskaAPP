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
  Min,
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
