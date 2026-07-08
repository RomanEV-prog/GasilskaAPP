import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  CreateRegistrationCodesDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateFcmTokenDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Get('organizations')
  @ApiOperation({ summary: 'Javni seznam društev (za izbiro ob prijavi)' })
  publicOrganizations() {
    return this.authService.publicOrganizations();
  }

  // Stroge meje proti napadom z ugibanjem gesel: 5 poskusov / minuto po IP.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prijava uporabnika' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Zamenjaj refresh žeton za nov par žetonov' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Registracija novega društva' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Izdaja aktivacijskih kod — samo za upravitelja platforme.
   * Zaščiteno z master ključem (env REGISTRATION_KEY) v glavi x-master-key;
   * če ključ ni nastavljen, je endpoint izklopljen.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('registration-codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Izdaj aktivacijske kode (master ključ)' })
  async createRegistrationCodes(
    @Headers('x-master-key') masterKey: string,
    @Body() dto: CreateRegistrationCodesDto,
  ) {
    const expected = process.env.REGISTRATION_KEY;
    if (!expected || masterKey !== expected) {
      throw new UnauthorizedException('Neveljaven master ključ.');
    }
    const codes = await this.authService.createRegistrationCodes(
      dto.count ?? 1,
      dto.note,
    );
    return { codes };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pošlji povezavo za ponastavitev gesla' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nastavi novo geslo' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prijavljeni uporabnik si spremeni geslo' })
  changePassword(
    @CurrentUser('userId') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      organizationId,
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Patch('fcm-token')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Posodobi Firebase FCM žeton' })
  updateFcmToken(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.authService.updateFcmToken(userId, dto.fcmToken);
  }
}
