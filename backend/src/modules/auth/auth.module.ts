import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/organization.entity';
import { RegistrationCode } from './registration-code.entity';
import { UserRole } from '../users/user-role.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Organization, RegistrationCode]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        // Varen kratkoživ privzetek: če kak sign() ne poda svojega expiresIn,
        // žeton dobi 1h (JWT_ACCESS_EXPIRES), ne 7 dni. Dostopni in refresh
        // žeton v AuthService itak podata svoj expiresIn (1h oz. 30d).
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES', '1h'),
        },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
