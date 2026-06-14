import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Stone, StoneMaterial } from '@/types/stone';
import { generateID, estimateVolume, estimateWeight } from '@/utils/geometry';
import { DEFAULT_STONES } from '@/data/paradigms';

interface StoneState {
  stones: Stone[];

  getStonesForProject: (projectId: string) => Stone[];
  getStoneMapForProject: (projectId: string) => Map<string, Stone>;
  ensureStonesForProject: (projectId: string) => Stone[];
  cloneStonesForProject: (sourceProjectId: string, destProjectId: string) => Map<string, string>;

  addStone: (projectId: string, data: Partial<Stone> & { material: StoneMaterial; name: string }) => Stone;
  updateStone: (id: string, data: Partial<Stone>) => void;
  removeStone: (id: string) => void;
  removeStonesForProject: (projectId: string) => void;

  getStone: (id: string) => Stone | undefined;
}

function makeSampleStones(projectId: string): Stone[] {
  return DEFAULT_STONES.map((ds, idx) => {
    const d = ds as Partial<Stone>;
    const length = d.length_cm ?? 60;
    const width = d.width_cm ?? 40;
    const height = d.height_cm ?? 50;
    const vol = d.volume_cm3 ?? estimateVolume(length, width, height);
    const mat = (d.material ?? 'TAIHU') as StoneMaterial;
    const weight = d.weight_kg ?? Math.round(estimateWeight(vol, mat) * 100) / 100;
    return {
      id: generateID('st'),
      project_id: projectId,
      code: d.code ?? `示例${String(idx + 1).padStart(3, '0')}`,
      name: d.name ?? `石品${idx + 1}`,
      material: mat,
      weight_kg: weight,
      length_cm: length,
      width_cm: width,
      height_cm: height,
      volume_cm3: vol,
      thinness: d.thinness ?? 6,
      wrinkle: d.wrinkle ?? 6,
      porosity: d.porosity ?? 5,
      complexity: d.complexity ?? 5,
      edges: d.edges ?? 5,
      texture_dir: d.texture_dir ?? '自然纹理',
      image_url: d.image_url,
      notes: d.notes,
      created_at: Date.now(),
    };
  });
}

export const useStoneStore = create<StoneState>()(
  persist(
    (set, get) => ({
      stones: [],

      getStonesForProject: (projectId) =>
        get().stones.filter((s) => s.project_id === projectId),

      getStoneMapForProject: (projectId) =>
        new Map(get().getStonesForProject(projectId).map((s) => [s.id, s])),

      ensureStonesForProject: (projectId) => {
        const existing = get().getStonesForProject(projectId);
        if (existing.length > 0) return existing;
        const samples = makeSampleStones(projectId);
        set((s) => ({ stones: [...s.stones, ...samples] }));
        return samples;
      },

      cloneStonesForProject: (sourceProjectId, destProjectId) => {
        const sources = get().getStonesForProject(sourceProjectId);
        const idMap = new Map<string, string>();
        const clones: Stone[] = sources.map((src) => {
          const newId = generateID('st');
          idMap.set(src.id, newId);
          return { ...src, id: newId, project_id: destProjectId, created_at: Date.now() };
        });
        set((s) => ({ stones: [...s.stones, ...clones] }));
        return idMap;
      },

      addStone: (projectId, data) => {
        const list = get().getStonesForProject(projectId);
        const id = generateID('st');
        const code = data.code ?? `${data.material[0]}${String(list.length + 1).padStart(3, '0')}`;
        const length = data.length_cm ?? 60;
        const width = data.width_cm ?? 40;
        const height = data.height_cm ?? 50;
        const vol = data.volume_cm3 ?? estimateVolume(length, width, height);
        const weight = data.weight_kg ?? Math.round(estimateWeight(vol, data.material) * 100) / 100;

        const newStone: Stone = {
          id,
          project_id: projectId,
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

      removeStonesForProject: (projectId) =>
        set((s) => ({ stones: s.stones.filter((st) => st.project_id !== projectId) })),

      getStone: (id) => get().stones.find((s) => s.id === id),
    }),
    { name: 'dieshan-stone-store' }
  )
);
