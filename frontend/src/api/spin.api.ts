import api from './client';

export interface Obcina {
  id: number;
  naziv: string;
  regija: string;
}

export interface SpinIntervention {
  id: string;
  spinType?: string;
  obcina?: string;
  title: string;
  description?: string;
  link?: string;
  occurredAt?: string;
}

export const spinApi = {
  obcine: (): Promise<Obcina[]> => api.get('/spin/obcine'),
  interventions: (): Promise<SpinIntervention[]> => api.get('/spin/interventions'),
};
