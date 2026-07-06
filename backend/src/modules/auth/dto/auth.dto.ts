import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@pgd-pekre.si' })
  @IsEmail({}, { message: 'Vnesite veljaven e-poštni naslov.' })
  email: string;

  @ApiProperty({ example: 'GasilApp123!' })
  @IsString()
  @MinLength(1, { message: 'Vnesite geslo.' })
  password: string;
}

export class RegisterDto {
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
