export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CenterOfGravityResult {
  overall_cg: Point3D;
  cg_x_cm: number;
  cg_y_cm: number;
  cg_z_cm: number;
  layer_cgs: { layer_id: string; layer_name: string; cg: Point3D; cg_x: number; cg_y: number; cg_z: number; weight_kg: number; total_weight_kg: number }[];
  projection_x: number;
  projection_y: number;
  support_polygon: { x: number; y: number }[];
  is_within_support: boolean;
  eccentricity_cm: number;
  eccentricity_x_cm: number;
  eccentricity_y_cm: number;
  stability_margin_percent: number;
  nearest_edge_distance_cm: number;
  distance_to_nearest_edge_cm: number;
  total_weight_kg: number;
}

export interface OverhangMomentResult {
  placed_stone_id: string;
  stone_name: string;
  overhang_length_cm: number;
  overhang_type: '挑' | '悬' | '无';
  weight_kg: number;
  cg_offset_cm: number;
  overturning_moment_Nm: number;
  counterweight_kg: number;
  required_counterweight_kg: number;
  counterweight_sufficient: boolean;
  safety_factor: number;
}

export interface ContactStressResult {
  placed_stone_id: string;
  stone_name: string;
  contact_count: number;
  total_contact_area_cm2: number;
  normal_force_N: number;
  shear_force_N: number;
  normal_stress_MPa: number;
  shear_stress_MPa: number;
  allowable_compressive_MPa: number;
  compressive_safety_factor: number;
  shear_safety_factor: number;
  is_cracking_risk: boolean;
}

export interface TieAndGroutResult {
  total_tie_force_kN: number;
  grout_shear_force_kN: number;
  grout_area_cm2: number;
  grout_stress_MPa: number;
  tie_spec: string;
  tie_count: number;
  tie_safety_factor: number;
  grout_safety_factor: number;
  force_distribution: { tie_percent: number; grout_percent: number; stone_percent: number };
}

export interface LoadCaseResult {
  case_name: string;
  description: string;
  case_type: '游人荷载' | '地震7度' | '地震8度' | '地震9度';
  horizontal_force_kN: number;
  lateral_force_kN: number;
  total_load_kN: number;
  total_weight_kN: number;
  base_width_cm: number;
  height_cm: number;
  resisting_moment_kNm: number;
  overturning_moment_kNm: number;
  safety_factor: number;
  is_safe: boolean;
}

export interface StressAnalysisResult {
  overhang: OverhangMomentResult;
  contact_stresses: ContactStressResult[];
  tie_grout: {
    tie_points_count: number;
    grout_seams_count: number;
    tie_safety_factor: number;
    grout_safety_factor: number;
    load_share_ratio: { stone: number; tie: number; grout: number };
  };
  load_cases: LoadCaseResult[];
  warnings: WarningItem[];
}

export interface WarningItem {
  id: string;
  level: 'info' | 'warning' | 'danger';
  category: string;
  title: string;
  description: string;
  related_stone_id?: string;
  suggestion: string;
}

export interface ConstructionStep {
  order: number;
  placed_stone_id: string;
  stone_name: string;
  stone_code: string;
  weight_kg: number;
  cumulative_weight_kg: number;
  operation: string;
  support_type: string;
  layer_name: string;
  notes?: string;
  requires_tie: boolean;
  requires_grout: boolean;
}

export interface AestheticScore {
  thin: number;
  wrinkle: number;
  leak: number;
  through: number;
  overall: number;
  harmony: number;
  grade: '精品' | '佳品' | '良品' | '合格' | '待优化';
  details: {
    dimension_ratio: number;
    silhouette: number;
    void_distribution: number;
    layered_rhythm: number;
  };
}
