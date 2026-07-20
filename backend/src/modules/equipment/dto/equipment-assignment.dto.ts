import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { EquipmentCondition } from '../equipment.entity';

/** Zadolžitev kosa opreme članu. */
export class IssueEquipmentDto {
  @ApiProperty({ example: 'uuid člana' })
  @IsUUID('4', { message: 'Neveljaven ID člana.' })
  userId: string;

  @ApiPropertyOptional({
    example: '2026-07-20T08:00:00Z',
    description: 'Privzeto zdaj',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum zadolžitve.' })
  issuedAt?: string;

  @ApiPropertyOptional({ enum: EquipmentCondition })
  @IsOptional()
  @IsEnum(EquipmentCondition, { message: 'Neveljavno stanje opreme.' })
  conditionAtIssue?: EquipmentCondition;

  @ApiPropertyOptional({ example: 'Predano ob vaji.' })
  @IsOptional()
  @IsString()
  issueNotes?: string;
}

/** Vračilo trenutno odprte zadolžitve. */
export class ReturnEquipmentDto {
  @ApiPropertyOptional({
    example: '2026-09-01T17:30:00Z',
    description: 'Privzeto zdaj',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum vračila.' })
  returnedAt?: string;

  @ApiPropertyOptional({ enum: EquipmentCondition })
  @IsOptional()
  @IsEnum(EquipmentCondition, { message: 'Neveljavno stanje opreme.' })
  conditionAtReturn?: EquipmentCondition;

  @ApiPropertyOptional({ example: 'Vrnjeno poškodovano — strgan šiv.' })
  @IsOptional()
  @IsString()
  returnNotes?: string;
}
