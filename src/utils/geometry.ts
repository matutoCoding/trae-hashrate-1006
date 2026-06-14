import type { Stone, PlacedStone, StackLayer, StackScheme } from '@/types/stone';
import type { Point3D, CenterOfGravityResult } from '@/types/calc';

export const MATERIAL_DENSITY: Record<string, number> = {
  TAIHU: 2400,
  YING: 2650,
  HUANG: 2550,
  LINGBI: 2700,
};

export function estimateVolume(lengthCm: number, widthCm: number, heightCm: number): number {
  const rawVolume = lengthCm * widthCm * heightCm;
  return rawVolume * 0.68;
}

export function estimateWeight(volumeCm3: number, material: string): number {
  const density = MATERIAL_DENSITY[material] ?? 2500;
  return (volumeCm3 / 1_000_000) * density;
}

function rayPointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function computeCenterOfGravity(
  scheme: StackScheme,
  layers: StackLayer[],
  placedStones: PlacedStone[],
  stonesMap: Map<string, Stone>
): CenterOfGravityResult {
  const layerCGs: { layer_id: string; layer_name: string; cg: Point3D; total_weight_kg: number }[] = [];
  let totalW = 0;
  let sumXW = 0, sumYW = 0, sumZW = 0;

  for (const layer of layers) {
    const layerStones = placedStones.filter(ps => ps.layer_id === layer.id);
    let lW = 0, lXW = 0, lYW = 0, lZW = 0;
    for (const ps of layerStones) {
      const st = stonesMap.get(ps.stone_id);
      if (!st) continue;
      const w = st.weight_kg;
      const cgx = ps.pos_x + st.length_cm / 2;
      const cgy = ps.pos_y + st.width_cm / 2;
      const cgz = ps.pos_z + st.height_cm / 2;
      lW += w;
      lXW += cgx * w;
      lYW += cgy * w;
      lZW += cgz * w;
    }
    if (lW > 0) {
      layerCGs.push({
        layer_id: layer.id,
        layer_name: layer.name,
        cg: { x: lXW / lW, y: lYW / lW, z: lZW / lW },
        total_weight_kg: lW,
      });
      totalW += lW;
      sumXW += lXW;
      sumYW += lYW;
      sumZW += lZW;
    }
  }

  const overallCG: Point3D = totalW > 0
    ? { x: sumXW / totalW, y: sumYW / totalW, z: sumZW / totalW }
    : { x: scheme.base_length_cm / 2, y: scheme.base_width_cm / 2, z: 0 };

  const supportPolygon = [
    { x: 0, y: 0 },
    { x: scheme.base_length_cm, y: 0 },
    { x: scheme.base_length_cm, y: scheme.base_width_cm },
    { x: 0, y: scheme.base_width_cm },
  ];

  const projX = overallCG.x;
  const projY = overallCG.y;
  const isWithin = rayPointInPolygon(projX, projY, supportPolygon);

  let minDist = Infinity;
  for (let i = 0; i < supportPolygon.length; i++) {
    const j = (i + 1) % supportPolygon.length;
    const d = pointToSegmentDistance(projX, projY, supportPolygon[i].x, supportPolygon[i].y, supportPolygon[j].x, supportPolygon[j].y);
    minDist = Math.min(minDist, d);
  }

  const baseCx = scheme.base_length_cm / 2;
  const baseCy = scheme.base_width_cm / 2;
  const ecc = Math.hypot(projX - baseCx, projY - baseCy);

  const minDim = Math.min(scheme.base_length_cm, scheme.base_width_cm);
  const margin = isWithin ? Math.min(100, (minDist / (minDim / 2)) * 100) : -Math.min(100, (minDist / (minDim / 2)) * 100);

  return {
    overall_cg: overallCG,
    layer_cgs: layerCGs,
    projection_x: projX,
    projection_y: projY,
    support_polygon: supportPolygon,
    is_within_support: isWithin,
    eccentricity_cm: +ecc.toFixed(2),
    stability_margin_percent: +margin.toFixed(1),
    nearest_edge_distance_cm: +minDist.toFixed(2),
  };
}

export function generateID(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
