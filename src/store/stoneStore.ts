import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Stone, StoneMaterial } from '@/types/stone';
import { generateID, estimateVolume, estimateWeight } from '@/utils/geometry';
import { DEFAULT_STONES } from '@/data/paradigms';

interface StoneState {
  stones: Stone[];
  addStone: (data: Partial<Stone> & { material: StoneMaterial; name: string }) => Stone;
  updateStone: (id: string, data: Partial<Stone>) => void;
  removeStone: (id: string) => void;
  getStoneMap: () => Map<string, Stone>;
  getStone: (id: string) => Stone | undefined;
  importStones: (list: Stone[]) => void;
}

export const useStoneStore = create<StoneState>()(
  persist(
    (set, get) => ({
      stones: DEFAULT_STONES as Stone[],

      addStone: (data) => {
        const id = generateID('st');
        const code = data.code ?? `${data.material[0]}${String(get().stones.length + 1).padStart(3, '0')}`;
        const length = data.length_cm ?? 60;
        const width = data.width_cm ?? 40;
        const height = data.height_cm ?? 50;
        const vol = data.volume_cm3 ?? estimateVolume(length, width, height);
        const weight = data.weight_kg ?? Math.round(estimateWeight(vol, data.material) * 100) / 100;

        const newStone: Stone = {
          id,
          code,
          name: data.name,
          material: data.material,
          weight_kg: weight,
          length_cm: length,
          width_cm: width,
          height_cm: height,
          volume_cm3: vol,
          thinness: data.thinness ?? 6,
          wrinkle: data.wrinkle ?? 6,
          porosity: data.porosity ?? 5,
          complexity: data.complexity ?? 5,
          edges: data.edges ?? 5,
          texture_dir: data.texture_dir ?? '自然纹理',
          image_url: data.image_url,
          notes: data.notes,
          created_at: Date.now(),
        };
        set((s) => ({ stones: [...s.stones, newStone] }));
        return newStone;
      },

      updateStone: (id, data) =>
        set((s) => ({
          stones: s.stones.map((st) => (st.id === id ? { ...st, ...data } : st)),
        })),

      removeStone: (id) =>
        set((s) => ({ stones: s.stones.filter((st) => st.id !== id) })),

      getStoneMap: () => new Map(get().stones.map((s) => [s.id, s])),

      getStone: (id) => get().stones.find((s) => s.id === id),

      importStones: (list) => set({ stones: [...get().stones, ...list] }),
    }),
    { name: 'dieshan-stone-store' }
  )
);
