import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  AvailabilityStatus,
  MembershipStatus,
  SystemRole,
} from '../../../common/enums/roles.enum';

export class CreateUserDto {
  @ApiPropertyOptional({
    example: 'janez@pgd-pekre.si',
    description: 'Neobvezna — prijava poteka z uporabniškim imenom.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Vnesite veljaven e-poštni naslov.' })
  email?: string;

  @ApiProperty({ example: 'GasilApp123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Geslo mora imeti vsaj 8 znakov.' })
  password: string;

  @ApiProperty({ example: 'Janez' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Novak' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '031123456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Glavna ulica 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Maribor' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '1990-05-12' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @ApiPropertyOptional({ example: 'Gasilec' })
  @IsOptional()
  @IsString()
  rank?: string;

  @ApiPropertyOptional({ example: 'PGD-0042' })
  @IsOptional()
  @IsString()
  membershipNumber?: string;

  @ApiPropertyOptional({ example: '2015-01-01' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @ApiPropertyOptional({ enum: SystemRole, isArray: true })
  @IsOptional()
  @IsEnum(SystemRole, { each: true })
  roles?: SystemRole[];
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: AvailabilityStatus, example: AvailabilityStatus.ON_LEAVE })
  @IsEnum(AvailabilityStatus, {
    message: 'Neveljaven status razpoložljivosti.',
  })
  availability: AvailabilityStatus;
}

export class UpdateSpinNotificationsDto {
  @ApiProperty({ example: false, description: 'Prejemanje SPIN obvestil' })
  @IsBoolean({ message: 'Neveljavna vrednost nastavitve.' })
  spinNotifications: boolean;
}

export class QueryUsersDto {
  @ApiPropertyOptional({ enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  isActive?: string;
}
