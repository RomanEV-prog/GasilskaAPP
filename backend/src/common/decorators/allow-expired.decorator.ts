import { SetMetadata } from '@nestjs/common';

export const ALLOW_EXPIRED_KEY = 'allowExpired';

/**
 * Dovoli spreminjajočo zahtevo tudi društvu s poteklo naročnino.
 *
 * Uporabi samo tam, kjer bi blokada zaklenila društvo v slepo ulico
 * (unovčenje kode za podaljšanje) ali pokvarila osnovno delovanje aplikacije
 * (osvežitev FCM žetona, označitev obvestila kot prebranega).
 */
export const AllowExpired = () => SetMetadata(ALLOW_EXPIRED_KEY, true);
