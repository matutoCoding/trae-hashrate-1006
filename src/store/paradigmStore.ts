import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Paradigm } from '@/types/paradigm';
import { DEFAULT_PARADIGMS } from '@/data/paradigms';

interface ParadigmState {
  customParadigms: Paradigm[];
  addCustomParadigm: (p: Paradigm) => void;
  removeCustomParadigm: (id: string) => void;
  updateCustomParadigm: (id: string, data: Partial<Paradigm>) => void;
  getAllParadigms: () => Paradigm[];
}

export const useParadigmStore = create<ParadigmState>()(
  persist(
    (set, get) => ({
      customParadigms: [],

      addCustomParadigm: (p) =>
        set((s) => ({ customParadigms: [...s.customParadigms, p] })),

      removeCustomParadigm: (id) =>
        set((s) => ({ customParadigms: s.customParadigms.filter((x) => x.id !== id) })),

      updateCustomParadigm: (id, data) =>
        set((s) => ({
          customParadigms: s.customParadigms.map((x) =>
            x.id === id ? ({ ...x, ...data, updatedAt: Date.now() } as Paradigm) : x
          ),
        })),

      getAllParadigms: () => [...DEFAULT_PARADIGMS, ...get().customParadigms],
    }),
    { name: 'dieshan-paradigm-store' }
  )
);
