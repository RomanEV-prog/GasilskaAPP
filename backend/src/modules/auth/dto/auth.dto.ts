import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'janez.novak',
    description: 'Uporabniško ime (znotraj društva) ali e-poštni naslov.',
  })
  @IsString()
  @MinLength(1, { message: 'Vnesite uporabniško ime.' })
  username: string;

  @ApiPropertyOptional({
    description:
      'ID društva — obvezen pri prijavi z uporabniškim imenom (pri e-pošti ni potreben).',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Neveljavno društvo.' })
  organizationId?: string;

  @ApiProperty({ example: 'GasilApp123!' })
  @IsString()
  @MinLength(1, { message: 'Vnesite geslo.' })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'StaroGeslo123!' })
  @IsString()
  @MinLength(1, { message: 'Vnesite trenutno geslo.' })
  currentPassword: string;

  @ApiProperty({ example: 'NovoGeslo123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Novo geslo mora imeti vsaj 8 znakov.' })
  newPassword: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'GASIL-AB12-CD34',
    description: 'Aktivacijska koda, ki jo izda upravitelj platforme.',
  })
  @IsString()
  @MinLength(1, { message: 'Vnesite aktivacijsko kodo.' })
  activationCode: string;

  @ApiProperty({ example: 'PGD Pekre' })
  @IsString()
  organizationName: string;

  @ApiProperty({ example: 'pgd-pekre' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Oznaka (slug) lahko vsebuje le male črke, številke in vezaje.',
  })
  organizationSlug: string;

  @ApiProperty({ example: 'Darjan' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Štajnmc' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'darjan@pgd-pekre.si' })
  @IsEmail({}, { message: 'Vnesite veljaven e-poštni naslov.' })
  email: string;

  @ApiProperty({ example: 'GasilApp123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Geslo mora imeti vsaj 8 znakov.' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-string' })
  @IsString()
  refreshToken: string;
}

export class UpdateFcmTokenDto {
  @ApiProperty({ example: 'fcm-token-string' })
  @IsString()
  fcmToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'janez@pgd-pekre.si' })
  @IsEmail({}, { message: 'Vnesite veljaven e-poštni naslov.' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-string' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NovoGeslo123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Geslo mora imeti vsaj 8 znakov.' })
  password: string;
}

export class CreateRegistrationCodesDto {
  @ApiPropertyOptional({ example: 1, description: 'Št. kod (največ 20).' })
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ example: 'PGD Radvanje — g. Kovač' })
  @IsOptional()
  @IsString()
  note?: string;
}
