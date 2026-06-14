import type { Stone, PlacedStone, StackLayer } from '@/types/stone';
import type { AestheticScore, ConstructionStep } from '@/types/calc';

export function computeAestheticScore(
  placedStones: PlacedStone[],
  stonesMap: Map<string, Stone>,
  layers: StackLayer[]
): AestheticScore {
  const stones = placedStones.map(ps => ({ ps, st: stonesMap.get(ps.stone_id)! })).filter(x => x.st);

  if (stones.length === 0) {
    return {
      thin: 0, wrinkle: 0, leak: 0, through: 0,
      overall: 0, harmony: 0, grade: '待优化',
      details: { dimension_ratio: 0, silhouette: 0, void_distribution: 0, layered_rhythm: 0 },
    };
  }

  let sumThinness = 0, sumWrinkle = 0, sumPorosity = 0, sumComplexity = 0, sumEdges = 0;
  for (const { st } of stones) {
    sumThinness += st.thinness;
    sumWrinkle += st.wrinkle;
    sumPorosity += st.porosity;
    sumComplexity += st.complexity;
    sumEdges += st.edges;
  }
  const thin = +(sumThinness / stones.length).toFixed(1);
  const wrinkle = +(sumWrinkle / stones.length).toFixed(1);
  const leak = +(sumPorosity / stones.length).toFixed(1);
  const through = +((sumComplexity + sumEdges) / (2 * stones.length)).toFixed(1);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxZ = 0;
  for (const { ps, st } of stones) {
    minX = Math.min(minX, ps.pos_x);
    maxX = Math.max(maxX, ps.pos_x + st.length_cm);
    minY = Math.min(minY, ps.pos_y);
    maxY = Math.max(maxY, ps.pos_y + st.width_cm);
    maxZ = Math.max(maxZ, ps.pos_z + st.height_cm);
  }
  const baseDim = Math.max(maxX - minX, maxY - minY);
  const dimRatio = baseDim > 0 ? (maxZ / baseDim) : 0;
  const dimensionRatio = +Math.min(100, Math.abs(dimRatio - 1.1) * -40 + 95).toFixed(1);

  let silhouette = 70;
  const zBuckets = new Map<number, number>();
  for (const { ps, st } of stones) {
    const b = Math.floor(ps.pos_z / 40);
    zBuckets.set(b, (zBuckets.get(b) ?? 0) + st.length_cm);
  }
  const bArr = Array.from(zBuckets.entries()).sort((a, b) => a[0] - b[0]);
  let monoton = true;
  for (let i = 1; i < bArr.length; i++) {
    if (bArr[i][1] > bArr[i - 1][1] * 1.1) { monoton = false; break; }
  }
  silhouette += monoton ? 15 : -10;
  silhouette += bArr.length >= 3 ? 10 : 0;
  silhouette = Math.max(0, Math.min(100, silhouette));

  let voidDist = 55;
  const porosityArr = stones.map(s => s.st.porosity);
  const mean = porosityArr.reduce((a, b) => a + b, 0) / porosityArr.length;
  const variance = porosityArr.reduce((s, v) => s + (v - mean) ** 2, 0) / porosityArr.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  voidDist += cv > 0.2 ? 20 : cv > 0.1 ? 10 : -5;
  voidDist += stones.length >= 5 ? 10 : 0;
  voidDist = Math.max(0, Math.min(100, voidDist));

  let layeredRhythm = 60;
  const layerCounts = layers.map(l => stones.filter(s => s.ps.layer_id === l.id).length);
  if (layerCounts.length >= 2) {
    const maxL = Math.max(...layerCounts);
    const minL = Math.min(...layerCounts.filter(c => c > 0));
    layeredRhythm += (maxL / Math.max(1, minL)) < 3 ? 20 : 0;
    layeredRhythm += layers.length >= 4 ? 15 : layers.length >= 3 ? 8 : 0;
  }
  layeredRhythm = Math.max(0, Math.min(100, layeredRhythm));

  const overall = +(thin * 0.2 + wrinkle * 0.2 + leak * 0.2 + through * 0.15 +
    dimensionRatio * 0.1 + silhouette * 0.05 + voidDist * 0.05 + layeredRhythm * 0.05).toFixed(1);
  const harmony = +((dimensionRatio + silhouette + voidDist + layeredRhythm) / 4).toFixed(1);

  let grade: AestheticScore['grade'];
  if (overall >= 90) grade = '精品';
  else if (overall >= 80) grade = '佳品';
  else if (overall >= 70) grade = '良品';
  else if (overall >= 60) grade = '合格';
  else grade = '待优化';

  return {
    thin, wrinkle, leak, through,
    overall, harmony, grade,
    details: {
      dimension_ratio: dimensionRatio,
      silhouette,
      void_distribution: voidDist,
      layered_rhythm: layeredRhythm,
    },
  };
}

const SUPPORT_OPERATION: Record<string, string> = {
  '叠': '顺势叠置，对花合缝',
  '竖': '立峰安设，三向稳刹',
  '横': '横向拼叠，错缝咬合',
  '挑': '悬挑出峰，后重压脚',
  '悬': '下垂悬垂，上加锚压',
  '安': '平稳安放，砂浆找平',
  '连': '两石相连，灌浆打刹',
  '接': '上下衔接，纹理贯通',
};

export function generateConstructionSequence(
  placedStones: PlacedStone[],
  stonesMap: Map<string, Stone>,
  layers: StackLayer[]
): ConstructionStep[] {
  const sorted = [...placedStones].sort((a, b) => {
    if (a.pos_z !== b.pos_z) return a.pos_z - b.pos_z;
    if (a.supported_by.length !== b.supported_by.length) return a.supported_by.length - b.supported_by.length;
    return 0;
  });

  const layerMap = new Map(layers.map(l => [l.id, l.name]));
  const steps: ConstructionStep[] = [];
  let cumWeight = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ps = sorted[i];
    const st = stonesMap.get(ps.stone_id);
    if (!st) continue;
    cumWeight += st.weight_kg;
    steps.push({
      order: i + 1,
      placed_stone_id: ps.id,
      stone_name: st.name,
      stone_code: st.code,
      weight_kg: st.weight_kg,
      cumulative_weight_kg: +cumWeight.toFixed(0),
      operation: SUPPORT_OPERATION[ps.support_type] ?? '稳妥安放',
      support_type: ps.support_type,
      layer_name: layerMap.get(ps.layer_id) ?? '未分层',
      requires_tie: ps.has_tie,
      requires_grout: ps.has_grout,
      notes: ps.supported_by.length > 0
        ? `支撑于石号: ${ps.supported_by.map(id => stonesMap.get(placedStones.find(p => p.id === id)?.stone_id ?? '')?.code ?? id).join('、')}`
        : '基础层坐底',
    });
  }

  return steps;
}
