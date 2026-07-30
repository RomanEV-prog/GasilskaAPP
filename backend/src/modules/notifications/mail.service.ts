import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Ovoj za pošiljanje e-pošte (SMTP, npr. Brevo).
 * Če MAIL_* env spremenljivke niso nastavljene (razvoj/testi), se pošiljanje
 * preskoči in samo logira — enak vzorec kot FirebaseService.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private from = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('MAIL_HOST');
    const port = Number(this.config.get<string>('MAIL_PORT', '587'));
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');
    const from = this.config.get<string>('MAIL_FROM');

    if (!host || !user || !pass || !from) {
      this.logger.warn(
        'SMTP ni konfiguriran (MAIL_*) — pošiljanje e-pošte je izklopljeno.',
      );
      return;
    }

    this.from = from;
    this.transporter = createTransport({
      host,
      port,
      // 587 = STARTTLS (secure: false + nadgradnja), 465 = implicitni TLS.
      secure: port === 465,
      auth: { user, pass },
    });
    this.logger.log('SMTP inicializiran — pošiljanje e-pošte je vklopljeno.');
  }

  get enabled(): boolean {
    return !!this.transporter;
  }

  /**
   * Pošlje e-pošto. Napaka se logira in NE vrže naprej — klicatelji (npr.
   * pozabljeno geslo) ne smejo spremeniti odgovora glede na uspeh pošiljanja.
   * Vrne true ob uspehu.
   */
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(`E-pošta preskočena (SMTP izklopljen): ${subject}`);
      return false;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      return true;
    } catch (err) {
      this.logger.error(
        `E-pošte ni bilo mogoče poslati (${subject}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }
}
