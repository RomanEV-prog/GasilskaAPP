import api from './client';

export interface Obcina {
  id: number;
  naziv: string;
  regija: string;
}

export const spinApi = {
  /** Statični seznam občin (backend ga vrne brez klica na SPIN). */
  obcine: (): Promise<Obcina[]> => api.get('/spin/obcine'),
};
