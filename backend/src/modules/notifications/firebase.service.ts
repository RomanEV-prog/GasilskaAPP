import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Ovoj za Firebase Cloud Messaging.
 * Če FIREBASE_* env spremenljivke niso nastavljene (razvoj),
 * se pošiljanje preskoči in samo logira.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn(
        'Firebase ni konfiguriran — push obvestila so izklopljena (razvoj).',
      );
      return;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // .env hrani \n kot dobesedni niz.
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    this.enabled = true;
    this.logger.log('Firebase inicializiran — push obvestila so vklopljena.');
  }

  /**
   * Pošlje push obvestilo na seznam FCM žetonov.
   * Vrne št. uspešnih in seznam neveljavnih žetonov (za čiščenje iz baze).
   */
  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<{ successCount: number; invalidTokens: string[] }> {
    if (!this.enabled || tokens.length === 0) {
      this.logger.debug(
        `Push preskočen (enabled=${this.enabled}, tokens=${tokens.length}).`,
      );
      return { successCount: 0, invalidTokens: [] };
    }

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });

    // Zberi žetone, ki jih je FCM zavrnil kot neveljavne/odjavljene.
    const invalidTokens: string[] = [];
    response.responses.forEach((res, i) => {
      const code = res.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (response.failureCount > 0) {
      this.logger.warn(
        `FCM: ${response.failureCount}/${tokens.length} pošiljanj neuspešnih, ${invalidTokens.length} neveljavnih žetonov.`,
      );
    }
    return { successCount: response.successCount, invalidTokens };
  }
}
