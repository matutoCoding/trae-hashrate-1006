import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConstructionStepRecord } from '@/types/project';
import type { PlacedStone, StackLayer, Stone } from '@/types/stone';
import { generateID } from '@/utils/geometry';

interface ConfirmData {
  operator?: string;
  reviewer?: string;
  lift_duration_min?: number;
  actual_weight_kg?: number;
  review_result?: string;
  notes?: string;
}

interface ConstructionState {
  records: ConstructionStepRecord[];
  isHandoverMode: boolean;

  setHandoverMode: (v: boolean) => void;

  initializeRecords: (
    projectId: string,
    schemeId: string,
    placed: PlacedStone[],
    stoneMap: Map<string, Stone>,
    layers: StackLayer[]
  ) => void;

  cloneRecords: (
    sourceProjectId: string,
    sourceSchemeId: string,
    destProjectId: string,
    destSchemeId: string,
    placedStoneIdMap: Map<string, string>
  ) => void;

  removeRecordsForProject: (projectId: string) => void;

  findRecord: (
    projectId: string,
    schemeId: string,
    placedStoneId: string
  ) => ConstructionStepRecord | undefined;

  confirmStep: (
    projectId: string,
    schemeId: string,
    placedStoneId: string,
    data: ConfirmData
  ) => void;

  rejectStep: (
    projectId: string,
    schemeId: string,
    placedStoneId: string,
    data: ConfirmData
  ) => void;

  markRevisionStep: (
    projectId: string,
    schemeId: string,
    placedStoneId: string,
    data: ConfirmData
  ) => void;

  resetStep: (projectId: string, schemeId: string, placedStoneId: string) => void;
  clearRecords: (projectId?: string, schemeId?: string) => void;

  getRecords: (projectId: string, schemeId: string) => ConstructionStepRecord[];
  getProgress: (projectId: string, schemeId: string) => {
    total: number;
    done: number;
    pending: number;
    rejected: number;
    percent: number;
  };
}

export const useConstructionStore = create<ConstructionState>()(
  persist(
    (set, get) => ({
      records: [],
      isHandoverMode: false,

      setHandoverMode: (v) => set({ isHandoverMode: v }),

      initializeRecords: (projectId, schemeId, placed, stoneMap, layers) => {
        const existing = get().records.filter(
          (r) => r.project_id === projectId && r.scheme_id === schemeId
        );
        const layerMap = new Map(layers.map((l) => [l.id, l]));

        const sorted = [...placed].sort((a, b) => {
          const la = layerMap.get(a.layer_id)?.layer_index ?? 99;
          const lb = layerMap.get(b.layer_id)?.layer_index ?? 99;
          if (la !== lb) return la - lb;
          return a.pos_z - b.pos_z;
        });

        const existingMap = new Map(existing.map((r) => [r.placed_stone_id, r]));
        const presentPlacedIds = new Set(placed.map((p) => p.id));

        const toKeep = existing.filter((r) => presentPlacedIds.has(r.placed_stone_id));
        const toAdd = sorted.filter((p) => !existingMap.has(p.id));

        let maxStep = 0;
        for (const r of toKeep) if (r.step_index > maxStep) maxStep = r.step_index;

        const addRecords: ConstructionStepRecord[] = toAdd.map((p, idx) => {
          const stone = stoneMap.get(p.stone_id);
          const layer = layerMap.get(p.layer_id);
          return {
            id: generateID('csr'),
            project_id: projectId,
            scheme_id: schemeId,
            placed_stone_id: p.id,
            step_index: maxStep + idx + 1,
            planned: {
              stone_name: stone?.name ?? '未命名石',
              stone_code: stone?.code ?? '??',
              support_type: p.support_type,
              layer_name: layer?.name ?? '未知层',
              pos_x_cm: p.pos_x,
              pos_y_cm: p.pos_y,
              pos_z_cm: p.pos_z,
              weight_kg: stone?.weight_kg ?? 0,
            },
            actual: {
              status: 'pending',
            },
          };
        });

        // 重新计算step_index按排序后的位置（保持已填记录顺序稳定，但按层/z排序）
        const merged = [...toKeep, ...addRecords];
        const sortedMerged = [...merged].sort((a, b) => {
          const pa = placed.find((p) => p.id === a.placed_stone_id);
          const pb = placed.find((p) => p.id === b.placed_stone_id);
          if (!pa || !pb) return a.step_index - b.step_index;
          const la = layerMap.get(pa.layer_id)?.layer_index ?? 99;
          const lb = layerMap.get(pb.layer_id)?.layer_index ?? 99;
          if (la !== lb) return la - lb;
          return pa.pos_z - pb.pos_z;
        });
        const withFreshIndex = sortedMerged.map((r, i) => ({ ...r, step_index: i + 1 }));

        set((s) => ({
          records: [
            ...s.records.filter(
              (r) => !(r.project_id === projectId && r.scheme_id === schemeId)
            ),
            ...withFreshIndex,
          ],
        }));
      },

      cloneRecords: (sourceProjectId, sourceSchemeId, destProjectId, destSchemeId, placedStoneIdMap) => {
        const src = get().records.filter(
          (r) => r.project_id === sourceProjectId && r.scheme_id === sourceSchemeId
        );
        const clones = src.map((r) => ({
          ...r,
          id: generateID('csr'),
          project_id: destProjectId,
          scheme_id: destSchemeId,
          placed_stone_id: placedStoneIdMap.get(r.placed_stone_id) ?? r.placed_stone_id,
        }));
        set((s) => ({ records: [...s.records, ...clones] }));
      },

      removeRecordsForProject: (projectId) =>
        set((s) => ({ records: s.records.filter((r) => r.project_id !== projectId) })),

      findRecord: (projectId, schemeId, placedStoneId) =>
        get().records.find(
          (r) =>
            r.project_id === projectId &&
            r.scheme_id === schemeId &&
            r.placed_stone_id === placedStoneId
        ),

      confirmStep: (projectId, schemeId, placedStoneId, data) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.project_id === projectId &&
            r.scheme_id === schemeId &&
            r.placed_stone_id === placedStoneId
              ? {
                  ...r,
                  actual: {
                    ...r.actual,
                    status: 'confirmed',
                    confirmed_at: Date.now(),
                    operator: data.operator ?? r.actual.operator,
                    reviewer: data.reviewer ?? r.actual.reviewer,
                    lift_duration_min: data.lift_duration_min ?? r.actual.lift_duration_min,
                    actual_weight_kg: data.actual_weight_kg ?? r.actual.actual_weight_kg,
                    review_result: data.review_result ?? r.actual.review_result,
                    notes: data.notes ?? r.actual.notes,
                  },
                }
              : r
          ),
        })),

      rejectStep: (projectId, schemeId, placedStoneId, data) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.project_id === projectId &&
            r.scheme_id === schemeId &&
            r.placed_stone_id === placedStoneId
              ? {
                  ...r,
                  actual: {
                    ...r.actual,
                    status: 'rejected',
                    confirmed_at: Date.now(),
                    operator: data.operator ?? r.actual.operator,
                    reviewer: data.reviewer ?? r.actual.reviewer,
                    lift_duration_min: data.lift_duration_min ?? r.actual.lift_duration_min,
                    actual_weight_kg: data.actual_weight_kg ?? r.actual.actual_weight_kg,
                    review_result: data.review_result ?? r.actual.review_result,
                    notes: data.notes ?? r.actual.notes,
                  },
                }
              : r
          ),
        })),

      markRevisionStep: (projectId, schemeId, placedStoneId, data) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.project_id === projectId &&
            r.scheme_id === schemeId &&
            r.placed_stone_id === placedStoneId
              ? {
                  ...r,
                  actual: {
                    ...r.actual,
                    status: 'revision',
                    confirmed_at: Date.now(),
                    operator: data.operator ?? r.actual.operator,
                    reviewer: data.reviewer ?? r.actual.reviewer,
                    lift_duration_min: data.lift_duration_min ?? r.actual.lift_duration_min,
                    actual_weight_kg: data.actual_weight_kg ?? r.actual.actual_weight_kg,
                    review_result: data.review_result ?? r.actual.review_result,
                    notes: data.notes ?? r.actual.notes,
                  },
                }
              : r
          ),
        })),

      resetStep: (projectId, schemeId, placedStoneId) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.project_id === projectId &&
            r.scheme_id === schemeId &&
            r.placed_stone_id === placedStoneId
              ? {
                  ...r,
                  actual: { status: 'pending' },
                }
              : r
          ),
        })),

      clearRecords: (projectId, schemeId) =>
        set((s) => ({
          records:
            projectId && schemeId
              ? s.records.filter(
                  (r) => !(r.project_id === projectId && r.scheme_id === schemeId)
                )
              : [],
        })),

      getRecords: (projectId, schemeId) =>
        get()
          .records.filter((r) => r.project_id === projectId && r.scheme_id === schemeId)
          .sort((a, b) => a.step_index - b.step_index),

      getProgress: (projectId, schemeId) => {
        const list = get().getRecords(projectId, schemeId);
        const total = list.length;
        const done = list.filter((r) => r.actual.status === 'confirmed').length;
        const pending = list.filter(
          (r) => r.actual.status === 'pending' || r.actual.status === 'revision'
        ).length;
        const rejected = list.filter((r) => r.actual.status === 'rejected').length;
        return {
          total,
          done,
          pending,
          rejected,
          percent: total === 0 ? 0 : Math.round((done / total) * 100),
        };
      },
    }),
    { name: 'dieshan-construction-store' }
  )
);
