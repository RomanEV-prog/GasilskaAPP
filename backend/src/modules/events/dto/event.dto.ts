import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { MembershipStatus } from '../../../common/enums/roles.enum';
import { RsvpStatus } from '../event-rsvp.entity';
import { EventType } from '../event.entity';

export class CreateEventDto {
  @ApiProperty({ example: 'Redna vaja' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Mesečna vaja operativcev' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Gasilski dom' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: EventType, example: EventType.DRILL })
  @IsEnum(EventType, { message: 'Neveljaven tip dogodka.' })
  eventType: EventType;

  @ApiProperty({ example: '2026-07-15T18:00:00Z' })
  @IsDateString({}, { message: 'Neveljaven datum začetka.' })
  startsAt: string;

  @ApiPropertyOptional({ example: '2026-07-15T20:00:00Z' })
  @IsOptional()
  @IsDateString({}, { message: 'Neveljaven datum konca.' })
  endsAt?: string;

  @ApiPropertyOptional({ enum: MembershipStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(MembershipStatus, { each: true })
  targetGroup?: MembershipStatus[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresRsvp?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sendNotification?: boolean;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reminderMinutes?: number;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class QueryEventsDto {
  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 'false', description: 'Vključi odpovedane' })
  @IsOptional()
  @IsString()
  includeCancelled?: string;
}

export class RsvpDto {
  @ApiProperty({ enum: RsvpStatus, example: RsvpStatus.ATTENDING })
  @IsEnum(RsvpStatus, { message: 'Neveljaven status udeležbe.' })
  status: RsvpStatus;

  @ApiPropertyOptional({ example: 'Pridem točno ob 18h' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AttendanceEntryDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID('4', { message: 'Neveljaven ID uporabnika.' })
  userId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  present: boolean;
}

export class MarkAttendanceDto {
  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Seznam prisotnosti ne sme biti prazen.' })
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
