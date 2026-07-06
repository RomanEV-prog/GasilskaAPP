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
  Max,
  Min,
} from 'class-validator';
import { VehicleType } from '../vehicle.entity';

export class CreateVehicleDto {
  @ApiProperty({ example: 'GVC 16/25' })
  @IsString()
  name: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.GVC })
  @IsEnum(VehicleType, { message: 'Neveljaven tip vozila.' })
  vehicleType: VehicleType;

  @ApiPropertyOptional({ example: 'MB AB-123' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ example: 'WBA...' })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiPropertyOptional({ example: 2015 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum registracije.' })
  registrationExpires?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum zavarovanja.' })
  insuranceExpires?: string;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum servisa.' })
  serviceDue?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  serviceMileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddDriverDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID('4', { message: 'Neveljaven ID uporabnika.' })
  userId: string;
}

export class ExpiringQueryDto {
  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
