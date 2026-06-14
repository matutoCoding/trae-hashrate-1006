import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Paradigm } from '@/types/paradigm';
import { DEFAULT_PARADIGMS } from '@/data/paradigms';

export interface ParadigmFilter {
  keyword?: string;
  style?: string;
  tags?: string[];
  scoreMin?: number;
  scoreMax?: number;
  difficultyMin?: number;
  difficultyMax?: number;
  favoriteOnly?: boolean;
  customOnly?: boolean;
  siteLengthCm?: number;
  siteWidthCm?: number;
}

interface ParadigmState {
  customParadigms: Paradigm[];

  addCustomParadigm: (p: Paradigm) => void;
  removeCustomParadigm: (id: string) => void;
  updateCustomParadigm: (id: string, data: Partial<Paradigm>) => void;
  toggleFavorite: (id: string) => void;

  getAllParadigms: () => Paradigm[];
  getParadigmById: (id: string) => Paradigm | undefined;
  filterParadigms: (f: ParadigmFilter) => Paradigm[];
  getAllTags: () => string[];
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

      toggleFavorite: (id) =>
        set((s) => {
          const inDefaults = DEFAULT_PARADIGMS.find((p) => p.id === id);
          if (inDefaults) {
            const existing = s.customParadigms.find((p) => p.id === id);
            if (existing) {
              return {
                customParadigms: s.customParadigms.map((p) =>
                  p.id === id ? ({ ...p, favorite: !p.favorite } as Paradigm) : p
                ),
              };
            }
            return {
              customParadigms: [
                ...s.customParadigms,
                { ...inDefaults, is_custom: false, favorite: true } as Paradigm,
              ],
            };
          }
          return {
            customParadigms: s.customParadigms.map((p) =>
              p.id === id ? ({ ...p, favorite: !p.favorite } as Paradigm) : p
            ),
          };
        }),

      getAllParadigms: () => {
        const customs = get().customParadigms;
        const overridden = new Set(customs.map((c) => c.id));
        const mergedDefaults = DEFAULT_PARADIGMS.filter((p) => !overridden.has(p.id)).map(
          (p) => ({ ...p, favorite: false })
        );
        return [...mergedDefaults, ...customs];
      },

      getParadigmById: (id) => get().getAllParadigms().find((p) => p.id === id),

      filterParadigms: (f) => {
        let list = get().getAllParadigms();
        if (f.keyword) {
          const kw = f.keyword.toLowerCase();
          list = list.filter(
            (p) =>
              p.name.toLowerCase().includes(kw) ||
              p.garden.toLowerCase().includes(kw) ||
              p.description.toLowerCase().includes(kw) ||
              (p.tags ?? []).some((t) => t.toLowerCase().includes(kw))
          );
        }
        if (f.style && f.style !== '全部流派') {
          list = list.filter((p) => p.style === f.style);
        }
        if (f.tags && f.tags.length > 0) {
          list = list.filter((p) => f.tags!.every((t) => (p.tags ?? []).includes(t)));
        }
        if (typeof f.scoreMin === 'number') list = list.filter((p) => p.score_overall >= f.scoreMin!);
        if (typeof f.scoreMax === 'number') list = list.filter((p) => p.score_overall <= f.scoreMax!);
        if (typeof f.difficultyMin === 'number') list = list.filter((p) => p.difficulty >= f.difficultyMin!);
        if (typeof f.difficultyMax === 'number') list = list.filter((p) => p.difficulty <= f.difficultyMax!);
        if (f.favoriteOnly) list = list.filter((p) => !!p.favorite);
        if (f.customOnly) list = list.filter((p) => p.is_custom);
        if (typeof f.siteLengthCm === 'number' && typeof f.siteWidthCm === 'number') {
          list = list.filter((p) => {
            const sd = p.site_dimensions;
            if (!sd) return true;
            const okL =
              (typeof sd.min_length_cm !== 'number' || f.siteLengthCm! >= sd.min_length_cm) &&
              (typeof sd.max_length_cm !== 'number' || f.siteLengthCm! <= sd.max_length_cm);
            const okW =
              (typeof sd.min_width_cm !== 'number' || f.siteWidthCm! >= sd.min_width_cm) &&
              (typeof sd.max_width_cm !== 'number' || f.siteWidthCm! <= sd.max_width_cm);
            return okL && okW;
          });
        }
        return list;
      },

      getAllTags: () => {
        const s = new Set<string>();
        for (const p of get().getAllParadigms()) (p.tags ?? []).forEach((t) => s.add(t));
        return Array.from(s);
      },
    }),
    { name: 'dieshan-paradigm-store' }
  )
);
