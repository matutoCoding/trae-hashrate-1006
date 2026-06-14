export type ProjectStatus = 'active' | 'archived' | 'draft';

export interface Project {
  id: string;
  name: string;
  code: string;
  client?: string;
  location?: string;
  description: string;
  status: ProjectStatus;
  base_dimensions: { length_cm: number; width_cm: number };
  created_at: number;
  updated_at: number;
  archived_at?: number;
  metadata: {
    tags?: string[];
    designer?: string;
    construction_leader?: string;
    estimated_completion_date?: number;
  };
}

export interface VerificationReport {
  id: string;
  project_id: string;
  scheme_id: string;
  name: string;
  generated_at: number;
  operator?: string;

  center_of_gravity: {
    cg_x_cm: number;
    cg_y_cm: number;
    cg_z_cm: number;
    eccentricity_x_cm: number;
    eccentricity_y_cm: number;
    distance_to_nearest_edge_cm: number;
    layer_cgs: { layer_id: string; layer_name: string; cg_x: number; cg_y: number; cg_z: number; weight_kg: number }[];
    total_weight_kg: number;
  };

  cantilever: {
    has_cantilever: boolean;
    max_overhang_cm: number;
    overturning_moment_nm: number;
    available_counterweight_kg: number;
    required_counterweight_kg: number;
    safety_factor: number;
  };

  contact_stresses: {
    placed_stone_id: string;
    stone_name: string;
    stone_code: string;
    max_stress_mpa: number;
    avg_stress_mpa: number;
    contact_area_cm2: number;
    supporting_stones: string[];
    status: 'safe' | 'warning' | 'danger';
  }[];

  tie_grout: {
    tie_points_count: number;
    grout_seams_count: number;
    tie_safety_factor: number;
    grout_safety_factor: number;
    load_share_ratio_tie: number;
    load_share_ratio_grout: number;
    load_share_ratio_stone: number;
  };

  load_cases: {
    case_name: string;
    case_description: string;
    horizontal_force_kn: number;
    total_load_kn: number;
    resisting_moment_kNm: number;
    overturning_moment_kNm: number;
    safety_factor: number;
    status: 'pass' | 'fail' | 'marginal';
  }[];

  warnings: {
    level: 'danger' | 'warning' | 'info';
    code: string;
    title: string;
    detail: string;
    suggestion: string;
  }[];

  overall_verdict: '合格' | '基本合格' | '待优化';
  overall_score: number;
}

export interface ConstructionStepRecord {
  id: string;
  project_id: string;
  scheme_id: string;
  placed_stone_id: string;
  step_index: number;

  planned: {
    stone_name: string;
    stone_code: string;
    support_type: string;
    layer_name: string;
    pos_x_cm: number;
    pos_y_cm: number;
    pos_z_cm: number;
    weight_kg: number;
  };

  actual: {
    status: 'pending' | 'confirmed' | 'rejected' | 'revision';
    confirmed_at?: number;
    operator?: string;
    reviewer?: string;
    lift_duration_min?: number;
    actual_weight_kg?: number;
    review_result?: string;
    notes?: string;
    site_photos?: string[];
  };
}

export type ProjectFilter = 'all' | 'active' | 'archived';
