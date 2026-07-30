import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { FirebaseService } from './firebase.service';
import { MailService } from './mail.service';
import { NotificationRead } from './notification-read.entity';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationRead, User]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseService, MailService],
  exports: [NotificationsService, MailService],
})
export class NotificationsModule {}
