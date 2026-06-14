export type StoneMaterial = 'TAIHU' | 'YING' | 'HUANG' | 'LINGBI';

export const MATERIAL_NAMES: Record<StoneMaterial, string> = {
  TAIHU: '太湖石',
  YING: '英石',
  HUANG: '黄石',
  LINGBI: '灵璧石',
};

export interface Stone {
  id: string;
  name: string;
  code: string;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  volume_cm3: number;
  material: StoneMaterial;
  thinness: number;
  wrinkle: number;
  porosity: number;
  complexity: number;
  edges: number;
  texture_dir: string;
  image_url?: string;
  notes?: string;
  created_at: number;
}

export type StoneSupportType = '叠' | '竖' | '横' | '挑' | '悬' | '安' | '连' | '接';

export interface ContactPoint {
  x: number;
  y: number;
  z: number;
  area_cm2: number;
}

export interface PlacedStone {
  id: string;
  stone_id: string;
  layer_id: string;
  scheme_id: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  support_type: StoneSupportType;
  supported_by: string[];
  contact_points: ContactPoint[];
  rotation: number;
  has_tie: boolean;
  tie_spec?: string;
  has_grout: boolean;
  sequence_order?: number;
}

export interface StackLayer {
  id: string;
  scheme_id: string;
  layer_index: number;
  layer_type: '基础层' | '主山层' | '中层' | '顶峦层' | '配石层';
  name: string;
  base_height_cm: number;
}

export interface StackScheme {
  id: string;
  name: string;
  description: string;
  base_length_cm: number;
  base_width_cm: number;
  created_at: number;
  updated_at: number;
}
