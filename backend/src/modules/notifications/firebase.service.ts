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

    // FCM sendEachForMulticast dovoli največ 500 žetonov na klic → razdeli.
    const invalidTokens: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
      const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
          data,
        });
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Zberi žetone, ki jih je FCM zavrnil kot neveljavne/odjavljene.
        response.responses.forEach((res, j) => {
          const code = res.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidTokens.push(batch[j]);
          }
        });
      } catch (err) {
        // Napaka celega paketa (npr. izpad FCM) ne sme sesuti obveščanja —
        // ostali paketi se še vedno pošljejo.
        failureCount += batch.length;
        this.logger.error(
          `FCM: paket ${i / FCM_BATCH_SIZE} ni bil poslan: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (failureCount > 0) {
      this.logger.warn(
        `FCM: ${failureCount}/${tokens.length} pošiljanj neuspešnih, ${invalidTokens.length} neveljavnih žetonov.`,
      );
    }
    return { successCount, invalidTokens };
  }
}

/** FCM sendEachForMulticast dovoli največ 500 žetonov na klic. */
const FCM_BATCH_SIZE = 500;
