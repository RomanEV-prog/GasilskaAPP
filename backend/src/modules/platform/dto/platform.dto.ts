import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Največ kod naenkrat — varovalka proti tipkarski napaki v `count`. */
export const MAX_CODES_PER_BATCH = 20;

/** Najdaljša naročnina, ki jo koda lahko odkleneti (5 let). */
export const MAX_VALID_MONTHS = 60;

export class IssueCodesDto {
  @ApiPropertyOptional({ example: 1, description: 'Št. kod (največ 20).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CODES_PER_BATCH)
  count?: number;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Koliko mesecev dostopa koda odklene (12 = letna, 2 = preizkus). ' +
      'Izpusti ali pošlji null za neomejeno naročnino.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_VALID_MONTHS)
  validMonths?: number | null;

  @ApiPropertyOptional({ example: 'PGD Radvanje — g. Kovač' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class RedeemCodeDto {
  @ApiProperty({ example: 'GASIL-A1B2-C3D4' })
  @IsString()
  @MaxLength(32)
  code: string;
}

/** Paket naročnine društva. */
export enum SubscriptionPlan {
  YEARLY = 'yearly',
  MONTHLY = 'monthly',
  PILOT = 'pilot',
  UNLIMITED = 'unlimited',
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'uuid društva' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: 12, description: 'Obdobje v mesecih.' })
  @IsInt()
  @Min(1)
  @Max(MAX_VALID_MONTHS)
  months: number;

  @ApiProperty({ example: 120, description: 'Znesek v EUR (brez DDV).' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Stopnja DDV v %. Privzeto iz nastavitev izdajatelja.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({ example: '2026-08-01', description: 'Začetek obdobja.' })
  @IsOptional()
  @IsISO8601()
  periodFrom?: string;

  @ApiPropertyOptional({ example: 8, description: 'Rok plačila v dneh.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  dueDays?: number;

  @ApiPropertyOptional({ example: 'Letna naročnina Plamen' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class MarkInvoicePaidDto {
  @ApiPropertyOptional({
    example: '2026-08-05',
    description: 'Datum plačila; privzeto danes.',
  })
  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Podaljšaj naročnino društva za obdobje računa (privzeto true).',
  })
  @IsOptional()
  @IsBoolean()
  extendSubscription?: boolean;
}

export class SetSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan, { message: 'Neveljaven paket naročnine.' })
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    example: '2027-07-28T00:00:00.000Z',
    description: 'Nov datum poteka naročnine.',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Podaljšaj za toliko mesecev (namesto točnega datuma).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_VALID_MONTHS)
  addMonths?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'true = neomejena naročnina (izbriše datum poteka).',
  })
  @IsOptional()
  @IsBoolean()
  unlimited?: boolean;
}
