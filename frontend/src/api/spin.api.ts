import api from './client';

export interface Obcina {
  id: number;
  naziv: string;
  regija: string;
}

export interface SpinIntervention {
  id: string;
  spinType: string | null;
  obcina: string | null;
  title: string;
  description: string | null;
  link: string | null;
  occurredAt: string | null;
}

export const spinApi = {
  /** Statični seznam občin (backend ga vrne brez klica na SPIN). */
  obcine: (): Promise<Obcina[]> => api.get('/spin/obcine'),
  /** Nedavne intervencije za občine društva (backend bere prek relaya). */
  interventions: (): Promise<SpinIntervention[]> =>
    api.get('/spin/interventions'),
};
