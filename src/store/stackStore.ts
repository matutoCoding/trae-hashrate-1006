import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StackScheme, StackLayer, PlacedStone, StoneSupportType, ContactPoint } from '@/types/stone';
import { generateID } from '@/utils/geometry';

interface StackState {
  currentSchemeId: string;
  schemes: StackScheme[];
  layers: StackLayer[];
  placedStones: PlacedStone[];

  createScheme: (projectId: string, name: string, description?: string, baseL?: number, baseW?: number) => StackScheme;
  setCurrentScheme: (id: string) => void;
  getSchemesForProject: (projectId: string) => StackScheme[];
  getSchemeForProject: (projectId: string) => StackScheme | null;
  ensureSchemeForProject: (projectId: string, baseL?: number, baseW?: number) => StackScheme;

  cloneSchemeForProject: (sourceProjectId: string, destProjectId: string, stoneIdMap: Map<string, string>) => { newSchemeId: string; placedStoneIdMap: Map<string, string> };

  addLayer: (layerType: StackLayer['layer_type'], name?: string, baseHeightCm?: number) => StackLayer;
  updateLayer: (id: string, data: Partial<StackLayer>) => void;
  removeLayer: (id: string) => void;
  getLayersForScheme: (schemeId: string) => StackLayer[];

  placeStone: (data: {
    stone_id: string;
    layer_id: string;
    pos_x: number;
    pos_y: number;
    pos_z: number;
    support_type?: StoneSupportType;
    supported_by?: string[];
    contact_points?: ContactPoint[];
    has_tie?: boolean;
    has_grout?: boolean;
  }) => PlacedStone;
  updatePlaced: (id: string, data: Partial<PlacedStone>) => void;
  removePlaced: (id: string) => void;
  getPlacedForScheme: (schemeId: string) => PlacedStone[];
  getPlacedForLayer: (layerId: string) => PlacedStone[];
  clearScheme: () => void;
}

export const useStackStore = create<StackState>()(
  persist(
    (set, get) => {
      return {
        currentSchemeId: '',
        schemes: [],
        layers: [],
        placedStones: [],

        createScheme: (projectId, name, description = '', baseL = 600, baseW = 400) => {
          const scheme: StackScheme = {
            id: generateID('sch'),
            project_id: projectId,
            name,
            description,
            base_length_cm: baseL,
            base_width_cm: baseW,
            created_at: Date.now(),
            updated_at: Date.now(),
          };
          set((s) => ({
            schemes: [...s.schemes, scheme],
            currentSchemeId: scheme.id,
          }));
          return scheme;
        },

        setCurrentScheme: (id) => set({ currentSchemeId: id }),

        getSchemesForProject: (projectId) =>
          get().schemes.filter(s => s.project_id === projectId),

        getSchemeForProject: (projectId) => {
          const list = get().getSchemesForProject(projectId);
          if (list.length === 0) return null;
          const cur = list.find(s => s.id === get().currentSchemeId);
          return cur ?? list[0];
        },

        ensureSchemeForProject: (projectId, baseL = 600, baseW = 400) => {
          const existing = get().getSchemeForProject(projectId);
          if (existing) {
            if (get().currentSchemeId !== existing.id) set({ currentSchemeId: existing.id });
            return existing;
          }
          return get().createScheme(projectId, `${projectId.slice(-4)}·堆叠方案`, '', baseL, baseW);
        },

        cloneSchemeForProject: (sourceProjectId, destProjectId, stoneIdMap) => {
          const srcScheme = get().getSchemeForProject(sourceProjectId);
          if (!srcScheme) {
            const fresh = get().createScheme(destProjectId, `${destProjectId.slice(-4)}·堆叠方案`);
            return { newSchemeId: fresh.id, placedStoneIdMap: new Map() };
          }

          const newSchemeId = generateID('sch');
          const destScheme: StackScheme = {
            ...srcScheme,
            id: newSchemeId,
            project_id: destProjectId,
            name: `${srcScheme.name}（副本）`,
            created_at: Date.now(),
            updated_at: Date.now(),
          };

          const srcLayers = get().getLayersForScheme(srcScheme.id);
          const layerIdMap = new Map<string, string>();
          const destLayers = srcLayers.map(sl => {
            const nl = generateID('lyr');
            layerIdMap.set(sl.id, nl);
            return { ...sl, id: nl, scheme_id: newSchemeId };
          });

          const srcPlaced = get().getPlacedForScheme(srcScheme.id);
          const placedIdMap = new Map<string, string>();
          const destPlaced = srcPlaced.map(sp => {
            const np = generateID('pl');
            placedIdMap.set(sp.id, np);
            return {
              ...sp,
              id: np,
              scheme_id: newSchemeId,
              stone_id: stoneIdMap.get(sp.stone_id) ?? sp.stone_id,
              layer_id: layerIdMap.get(sp.layer_id) ?? sp.layer_id,
              supported_by: sp.supported_by.map(sid => placedIdMap.get(sid) ?? sid),
            };
          });

          set((s) => ({
            schemes: [...s.schemes, destScheme],
            layers: [...s.layers, ...destLayers],
            placedStones: [...s.placedStones, ...destPlaced],
            currentSchemeId: newSchemeId,
          }));
          return { newSchemeId, placedStoneIdMap: placedIdMap };
        },

        addLayer: (layerType, name, baseHeightCm = 0) => {
          const { schemes, currentSchemeId } = get();
          const scheme = schemes.find(s => s.id === currentSchemeId) ?? schemes[0];
          if (!scheme) {
            throw new Error('No active scheme');
          }
          const existing = get().layers.filter(l => l.scheme_id === scheme.id);
          const layer: StackLayer = {
            id: generateID('lyr'),
            scheme_id: scheme.id,
            layer_index: existing.length,
            layer_type: layerType,
            name: name ?? `${layerType}-${existing.length + 1}`,
            base_height_cm: baseHeightCm,
          };
          set((s) => ({ layers: [...s.layers, layer] }));
          return layer;
        },

        updateLayer: (id, data) =>
          set((s) => ({
            layers: s.layers.map((l) => (l.id === id ? { ...l, ...data } : l)),
          })),

        removeLayer: (id) => {
          set((s) => ({
            layers: s.layers.filter((l) => l.id !== id),
            placedStones: s.placedStones.filter((p) => p.layer_id !== id),
          }));
        },

        getLayersForScheme: (schemeId) =>
          get().layers.filter(l => l.scheme_id === schemeId).sort((a, b) => a.layer_index - b.layer_index),

        placeStone: (data) => {
          const scheme = get().schemes.find(s => s.id === get().currentSchemeId) ?? get().schemes[0];
          if (!scheme) throw new Error('No active scheme');
          const placed: PlacedStone = {
            id: generateID('pl'),
            scheme_id: scheme.id,
            stone_id: data.stone_id,
            layer_id: data.layer_id,
            pos_x: data.pos_x,
            pos_y: data.pos_y,
            pos_z: data.pos_z,
            support_type: data.support_type ?? '安',
            supported_by: data.supported_by ?? [],
            contact_points: data.contact_points ?? [],
            rotation: 0,
            has_tie: data.has_tie ?? false,
            has_grout: data.has_grout ?? false,
          };
          set((s) => ({
            placedStones: [...s.placedStones, placed],
            schemes: s.schemes.map(sc => sc.id === scheme.id ? { ...sc, updated_at: Date.now() } : sc),
          }));
          return placed;
        },

        updatePlaced: (id, data) =>
          set((s) => ({
            placedStones: s.placedStones.map((p) => (p.id === id ? { ...p, ...data } : p)),
          })),

        removePlaced: (id) => {
          set((s) => ({
            placedStones: s.placedStones
              .filter(p => p.id !== id)
              .map(p => ({ ...p, supported_by: p.supported_by.filter(sid => sid !== id) })),
          }));
        },

        getPlacedForScheme: (schemeId) => get().placedStones.filter(p => p.scheme_id === schemeId),
        getPlacedForLayer: (layerId) => get().placedStones.filter(p => p.layer_id === layerId),

        clearScheme: () => {
          const schemeId = get().currentSchemeId;
          set((s) => ({
            layers: s.layers.filter(l => l.scheme_id !== schemeId),
            placedStones: s.placedStones.filter(p => p.scheme_id !== schemeId),
          }));
        },
      };
    },
    { name: 'dieshan-stack-store' }
  )
);
