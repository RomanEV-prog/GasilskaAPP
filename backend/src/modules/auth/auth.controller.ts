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
import { createHash, timingSafeEqual } from 'crypto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowExpired } from '../../common/decorators/allow-expired.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { IssueCodesDto } from '../platform/dto/platform.dto';
import { PlatformService } from '../platform/platform.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  Disable2faDto,
  Enable2faDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateFcmTokenDto,
  Verify2faDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly platformService: PlatformService,
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

  // Drugi korak prijave pri vklopljeni 2FA. Enaka stroga meja kot prijava.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Potrdi TOTP kodo (drugi korak prijave)' })
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verify2fa(dto.pendingToken, dto.code);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('2fa/setup')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ustvari 2FA skrivnost in QR kodo' })
  setup2fa(@CurrentUser('userId') userId: string) {
    return this.authService.setup2fa(userId);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/enable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vklopi 2FA (potrdi kodo, vrne rezervne kode)' })
  enable2fa(
    @CurrentUser('userId') userId: string,
    @Body() dto: Enable2faDto,
  ) {
    return this.authService.enable2fa(userId, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Izklopi 2FA (geslo + koda)' })
  disable2fa(
    @CurrentUser('userId') userId: string,
    @Body() dto: Disable2faDto,
  ) {
    return this.authService.disable2fa(userId, dto.password, dto.code);
  }

  @Get('2fa/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stanje 2FA prijavljenega uporabnika' })
  get2faStatus(@CurrentUser('userId') userId: string) {
    return this.authService.get2faStatus(userId);
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
   * Izdaja aktivacijskih kod z master ključem (env REGISTRATION_KEY v glavi
   * x-master-key); če ključ ni nastavljen, je endpoint izklopljen.
   *
   * Ohranjen kot zasilna pot: z njim se izda prva koda na sveži namestitvi,
   * ko super_admin računa še ni. Redno izdajanje teče prek `/platform/codes`
   * v portalu.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('registration-codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Izdaj aktivacijske kode (master ključ)' })
  async createRegistrationCodes(
    @Headers('x-master-key') masterKey: string,
    @Body() dto: IssueCodesDto,
  ) {
    const expected = process.env.REGISTRATION_KEY;
    // Primerjava prek hashev v konstantnem času — preprečuje timing napad,
    // hkrati reši različni dolžini vhodov (timingSafeEqual zahteva enaki).
    const provided = masterKey ?? '';
    const match =
      !!expected &&
      timingSafeEqual(
        createHash('sha256').update(provided).digest(),
        createHash('sha256').update(expected).digest(),
      );
    if (!match) {
      throw new UnauthorizedException('Neveljaven master ključ.');
    }
    const issued = await this.platformService.issueCodes(dto, null);
    return { codes: issued.map((c) => c.code) };
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

  // Naprava mora osvežiti žeton tudi v poteklem društvu, sicer po podaljšanju
  // ne bi prejemala push obvestil.
  @Patch('fcm-token')
  @AllowExpired()
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
