import type {
  InvoiceIssuer,
  InvoiceSummary,
  Organization,
  PlatformInvoice,
  PlatformOrganization,
  RegistrationCode,
  SubscriptionPlan,
} from '../types';
import api from './client';

export interface CreateInvoicePayload {
  organizationId: string;
  months: number;
  amount: number;
  vatRate?: number;
  periodFrom?: string;
  dueDays?: number;
  note?: string;
}

/** Račun s podatki društva in izdajatelja — za natisljiv izpis. */
export interface InvoiceDetail {
  invoice: PlatformInvoice;
  totals: { net: number; vat: number; gross: number };
  organization: Organization | null;
  issuer: InvoiceIssuer;
}

export interface IssueCodesPayload {
  count: number;
  /** Mesecev naročnine; null = neomejeno. */
  validMonths: number | null;
  note?: string;
}

/** Upravljanje platforme — dostopno samo vlogi `super_admin`. */
export const platformApi = {
  listOrganizations: (): Promise<PlatformOrganization[]> =>
    api.get('/platform/organizations'),

  setSubscription: (
    orgId: string,
    data: {
      expiresAt?: string;
      addMonths?: number;
      unlimited?: boolean;
      plan?: SubscriptionPlan;
    },
  ): Promise<Organization> =>
    api.patch(`/platform/organizations/${orgId}/subscription`, data),

  listCodes: (): Promise<RegistrationCode[]> => api.get('/platform/codes'),

  issueCodes: (data: IssueCodesPayload): Promise<RegistrationCode[]> =>
    api.post('/platform/codes', data),

  revokeCode: (id: string): Promise<RegistrationCode> =>
    api.post(`/platform/codes/${id}/revoke`),

  // ── Računi ──
  getIssuer: (): Promise<InvoiceIssuer> => api.get('/platform/issuer'),

  listInvoices: (): Promise<PlatformInvoice[]> => api.get('/platform/invoices'),

  invoicesSummary: (): Promise<InvoiceSummary> =>
    api.get('/platform/invoices/summary'),

  getInvoice: (id: string): Promise<InvoiceDetail> =>
    api.get(`/platform/invoices/${id}`),

  createInvoice: (data: CreateInvoicePayload): Promise<PlatformInvoice> =>
    api.post('/platform/invoices', data),

  markInvoicePaid: (
    id: string,
    data: { paidAt?: string; extendSubscription?: boolean } = {},
  ): Promise<PlatformInvoice> =>
    api.post(`/platform/invoices/${id}/paid`, data),

  cancelInvoice: (id: string): Promise<PlatformInvoice> =>
    api.post(`/platform/invoices/${id}/cancel`),
};

/** Podaljšanje naročnine lastnega društva (org_admin). */
export const redeemCode = (code: string): Promise<Organization> =>
  api.post('/organizations/me/redeem-code', { code });
