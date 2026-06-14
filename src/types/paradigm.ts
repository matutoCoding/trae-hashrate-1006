export interface ParadigmStoneSkeleton {
  stone_code: string;
  role: '主山' | '副山' | '配石' | '挑石' | '悬石' | '压脚' | '洞门' | '踏步';
  relative_weight_ratio: number;
  relative_position: { x: number; y: number; z: number };
  support_type: string;
  aesthetic_notes: string;
}

export interface ParadigmLayer {
  layer_type: string;
  name: string;
  stones: ParadigmStoneSkeleton[];
  height_ratio: number;
}

export interface Paradigm {
  id: string;
  name: string;
  garden: string;
  dynasty: string;
  style: '环秀山庄式' | '片石山房式' | '豫园式' | '个园式' | '苏州式' | '扬州式' | '岭南式' | '北方皇家';
  difficulty: 1 | 2 | 3 | 4 | 5;
  height_m: number;
  base_dimensions: { length_cm: number; width_cm: number };
  estimated_weight_ton: number;
  stone_count: number;
  layers: ParadigmLayer[];
  score_overall: number;
  score_thin: number;
  score_wrinkle: number;
  score_leak: number;
  score_through: number;
  description: string;
  techniques: string[];
  key_points: string[];
  image_thumb: string;
  is_custom: boolean;
  created_at: number;
}
