import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

/** Polja, ki jih nikoli ne zapišemo v audit log. */
const REDACTED_KEYS = /password|fcmtoken|token|secret/i;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /** Rekurzivno odstrani občutljiva polja. */
  redact(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.redact(item));
    }
    if (data && typeof data === 'object') {
      const clean: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        clean[key] = REDACTED_KEYS.test(key)
          ? '[REDACTED]'
          : this.redact(value);
      }
      return clean;
    }
    return data;
  }

  /** Zapiše dogodek. Napaka pri logiranju nikoli ne prekine zahteve. */
  async log(entry: {
    organizationId?: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    newData?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          ...entry,
          newData: entry.newData ? this.redact(entry.newData) : undefined,
        }),
      );
    } catch (err) {
      this.logger.error(`Audit log ni uspel: ${(err as Error).message}`);
    }
  }
}
