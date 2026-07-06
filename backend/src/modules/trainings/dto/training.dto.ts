import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTrainingDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID('4', { message: 'Neveljaven ID uporabnika.' })
  userId: string;

  @ApiProperty({ example: 'Prva pomoč' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Rdeči križ' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ example: '2023-05-10' })
  @IsDateString({}, { message: 'Neveljaven datum opravljanja.' })
  completedAt: string;

  @ApiPropertyOptional({ example: '2026-05-10' })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum poteka.' })
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Opravljeno v Mariboru' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;
}

export class UpdateTrainingDto extends PartialType(CreateTrainingDto) {}

export class ExpiringTrainingsQueryDto {
  @ApiPropertyOptional({ example: 60, default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
