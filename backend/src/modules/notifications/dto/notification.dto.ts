import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { NotificationTarget } from '../notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Odpovedan sestanek' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Sestanek v petek je odpovedan. Novo vabilo sledi.' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ example: 'general', default: 'general' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    enum: NotificationTarget,
    default: NotificationTarget.ALL,
  })
  @IsOptional()
  @IsEnum(NotificationTarget, { message: 'Neveljavna ciljna skupina.' })
  target?: NotificationTarget;

  @ApiPropertyOptional({ type: [String], description: 'Obvezno, če target = specific' })
  @ValidateIf((o) => o.target === NotificationTarget.SPECIFIC)
  @IsArray()
  @ArrayNotEmpty({ message: 'Pri ciljni skupini "specific" navedite prejemnike.' })
  @IsUUID('4', { each: true, message: 'Neveljaven ID prejemnika.' })
  targetUserIds?: string[];

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
