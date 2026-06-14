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
        if (existing.length > 0) return;

        const layerMap = new Map(layers.map((l) => [l.id, l]));

        const sorted = [...placed].sort((a, b) => {
          const la = layerMap.get(a.layer_id)?.layer_index ?? 99;
          const lb = layerMap.get(b.layer_id)?.layer_index ?? 99;
          if (la !== lb) return la - lb;
          return a.pos_z - b.pos_z;
        });

        const records: ConstructionStepRecord[] = sorted.map((p, idx) => {
          const stone = stoneMap.get(p.stone_id);
          const layer = layerMap.get(p.layer_id);
          return {
            id: generateID('csr'),
            project_id: projectId,
            scheme_id: schemeId,
            placed_stone_id: p.id,
            step_index: idx + 1,
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

        set((s) => ({ records: [...s.records, ...records] }));
      },

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
