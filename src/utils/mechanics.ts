import type { Stone, PlacedStone, StackScheme, StackLayer } from '@/types/stone';
import type {
  OverhangMomentResult,
  ContactStressResult,
  TieAndGroutResult,
  LoadCaseResult,
  WarningItem,
  CenterOfGravityResult,
} from '@/types/calc';

export const ALLOWABLE_COMPRESSIVE_STRESS: Record<string, number> = {
  TAIHU: 25,
  YING: 60,
  HUANG: 40,
  LINGBI: 80,
};

export const ALLOWABLE_SHEAR_STRESS_RATIO = 0.12;
export const GROUT_ALLOWABLE_STRESS = 12.0;
export const GROUT_TENSILE_FRACTION = 0.35;

export const TIE_SPECS = [
  { name: '4号镀锌铁丝', diameter_mm: 4, allowable_tension_kN: 5.5 },
  { name: '6号圆钢', diameter_mm: 6, allowable_tension_kN: 12.5 },
  { name: '8号圆钢', diameter_mm: 8, allowable_tension_kN: 28.0 },
  { name: '10号圆钢', diameter_mm: 10, allowable_tension_kN: 44.0 },
];

export const SEISMIC_COEFFICIENTS: { type: LoadCaseResult['case_type']; coeff: number }[] = [
  { type: '游人荷载', coeff: 0.05 },
  { type: '地震7度', coeff: 0.08 },
  { type: '地震8度', coeff: 0.16 },
  { type: '地震9度', coeff: 0.32 },
];

export const REQUIRED_OVERTURNING_SAFETY = 1.5;
export const LIVE_LOAD_KN_M2 = 3.5;

export function computeOverhangMoments(
  placedStones: PlacedStone[],
  stonesMap: Map<string, Stone>,
  baseLengthCm: number
): OverhangMomentResult[] {
  const results: OverhangMomentResult[] = [];
  const placedMap = new Map(placedStones.map(p => [p.id, p]));

  for (const ps of placedStones) {
    const stone = stonesMap.get(ps.stone_id);
    if (!stone) continue;

    const isCantilever = ps.support_type === '挑' || ps.support_type === '悬';
    if (!isCantilever && ps.supported_by.length === 0) continue;

    let cgOffset = 0;
    let overhangLen = 0;
    let overhangType: OverhangMomentResult['overhang_type'] = '无';

    if (ps.support_type === '挑' || ps.support_type === '悬') {
      overhangType = ps.support_type;
      const supStones = ps.supported_by
        .map(id => placedMap.get(id))
        .filter(Boolean) as PlacedStone[];
      if (supStones.length > 0) {
        let avgSupEdge = 0;
        for (const s of supStones) {
          const sStone = stonesMap.get(s.stone_id);
          if (sStone) avgSupEdge += s.pos_x + sStone.length_cm;
        }
        avgSupEdge /= supStones.length;
        const stoneCG = ps.pos_x + stone.length_cm / 2;
        cgOffset = Math.max(0, stoneCG - avgSupEdge);
        overhangLen = Math.max(0, ps.pos_x + stone.length_cm - avgSupEdge);
      } else {
        cgOffset = stone.length_cm * 0.3;
        overhangLen = stone.length_cm * 0.4;
      }
    }

    const weight = stone.weight_kg;
    const overturnM = (weight * 9.81 * cgOffset) / 100;

    let counterweight = 0;
    for (const other of placedStones) {
      if (other.id === ps.id) continue;
      const oStone = stonesMap.get(other.stone_id);
      if (!oStone) continue;
      const otherCG = other.pos_x + oStone.length_cm / 2;
      const stoneCG = ps.pos_x + stone.length_cm / 2;
      if (otherCG < stoneCG - 2) {
        counterweight += oStone.weight_kg * Math.min(1, (stoneCG - otherCG) / 50);
      }
    }

    const requiredCounterweight = (weight * cgOffset) / Math.max(10, (baseLengthCm / 2 - cgOffset));
    const sf = requiredCounterweight > 0 ? counterweight / requiredCounterweight : 99;

    results.push({
      placed_stone_id: ps.id,
      stone_name: stone.name,
      overhang_length_cm: +overhangLen.toFixed(1),
      overhang_type: overhangType,
      weight_kg: weight,
      cg_offset_cm: +cgOffset.toFixed(1),
      overturning_moment_Nm: +overturnM.toFixed(2),
      counterweight_kg: +counterweight.toFixed(1),
      required_counterweight_kg: +Math.max(0, requiredCounterweight).toFixed(1),
      counterweight_sufficient: counterweight >= requiredCounterweight || sf >= 1.2,
      safety_factor: +Math.min(9.9, sf).toFixed(2),
    });
  }

  return results.sort((a, b) => b.overturning_moment_Nm - a.overturning_moment_Nm);
}

export function computeContactStresses(
  placedStones: PlacedStone[],
  stonesMap: Map<string, Stone>
): ContactStressResult[] {
  const results: ContactStressResult[] = [];
  const upperLoads = new Map<string, number>();

  const sorted = [...placedStones].sort((a, b) => a.pos_z - b.pos_z);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const ps = sorted[i];
    const stone = stonesMap.get(ps.stone_id);
    if (!stone) continue;
    let load = stone.weight_kg;
    load += upperLoads.get(ps.id) ?? 0;
    for (const supId of ps.supported_by) {
      upperLoads.set(supId, (upperLoads.get(supId) ?? 0) + load / Math.max(1, ps.supported_by.length));
    }
  }

  for (const ps of placedStones) {
    const stone = stonesMap.get(ps.stone_id);
    if (!stone) continue;
    if (ps.contact_points.length === 0 && ps.supported_by.length === 0) continue;

    let totalArea = 0;
    if (ps.contact_points.length > 0) {
      totalArea = ps.contact_points.reduce((s, c) => s + c.area_cm2, 0);
    } else {
      totalArea = Math.max(20, stone.length_cm * stone.width_cm * 0.08 * ps.supported_by.length);
    }

    const totalLoadKg = stone.weight_kg + (upperLoads.get(ps.id) ?? 0);
    const normalN = totalLoadKg * 9.81;
    const shearN = normalN * 0.15;
    const areaM2 = totalArea / 10_000;
    const normalMPa = areaM2 > 0 ? (normalN / 1_000_000) / areaM2 : 999;
    const shearMPa = areaM2 > 0 ? (shearN / 1_000_000) / areaM2 : 999;
    const allowComp = ALLOWABLE_COMPRESSIVE_STRESS[stone.material] ?? 30;
    const allowShear = allowComp * ALLOWABLE_SHEAR_STRESS_RATIO;
    const compSF = normalMPa > 0 ? allowComp / normalMPa : 9.9;
    const shearSF = shearMPa > 0 ? allowShear / shearMPa : 9.9;

    results.push({
      placed_stone_id: ps.id,
      stone_name: stone.name,
      contact_count: Math.max(ps.contact_points.length, ps.supported_by.length),
      total_contact_area_cm2: +totalArea.toFixed(1),
      normal_force_N: +normalN.toFixed(0),
      shear_force_N: +shearN.toFixed(0),
      normal_stress_MPa: +Math.min(999, normalMPa).toFixed(2),
      shear_stress_MPa: +Math.min(999, shearMPa).toFixed(3),
      allowable_compressive_MPa: allowComp,
      compressive_safety_factor: +Math.min(9.9, compSF).toFixed(2),
      shear_safety_factor: +Math.min(9.9, shearSF).toFixed(2),
      is_cracking_risk: compSF < 1.5 || shearSF < 1.5,
    });
  }

  return results.sort((a, b) => a.compressive_safety_factor - b.compressive_safety_factor);
}

export function computeTieAndGrout(
  overhangs: OverhangMomentResult[],
  placedStones: PlacedStone[]
): TieAndGroutResult {
  let totalTieForceKN = 0;
  let totalGroutShearKN = 0;
  let totalGroutArea = 0;
  let tieCount = 0;
  let tieSpec = TIE_SPECS[0].name;

  for (let i = 0; i < overhangs.length; i++) {
    const oh = overhangs[i];
    if (oh.overhang_type === '无') continue;
    const ps = placedStones.find(p => p.id === oh.placed_stone_id);
    if (!ps) continue;

    const unfactoredM = oh.overturning_moment_Nm * 1.3;
    const stoneHeight = 30;
    const tieForceKN = unfactoredM / (stoneHeight / 100) / 1000;
    if (ps.has_tie) {
      totalTieForceKN += tieForceKN;
      tieCount++;
      if (oh.overturning_moment_Nm > 200 && TIE_SPECS[2]) tieSpec = TIE_SPECS[2].name;
      else if (oh.overturning_moment_Nm > 80 && TIE_SPECS[1]) tieSpec = TIE_SPECS[1].name;
    }
    if (ps.has_grout) {
      totalGroutShearKN += unfactoredM * GROUT_TENSILE_FRACTION / (stoneHeight / 100) / 1000;
      totalGroutArea += Math.max(50, oh.weight_kg * 2);
    }
  }

  if (tieCount === 0) tieSpec = '未使用';

  const maxTieAllow = TIE_SPECS.find(s => s.name === tieSpec)?.allowable_tension_kN ?? TIE_SPECS[0].allowable_tension_kN;
  const tieSF = totalTieForceKN > 0 ? (maxTieAllow * Math.max(1, tieCount)) / totalTieForceKN : 9.9;

  const groutAreaM2 = totalGroutArea / 10_000;
  const groutStress = groutAreaM2 > 0 ? (totalGroutShearKN) / groutAreaM2 : 0;
  const groutSF = groutStress > 0 ? GROUT_ALLOWABLE_STRESS / groutStress : 9.9;

  const totalForce = totalTieForceKN + totalGroutShearKN;
  const tiePct = totalForce > 0 ? (totalTieForceKN / totalForce) * 100 : 0;
  const groutPct = totalForce > 0 ? (totalGroutShearKN / totalForce) * 100 : 0;

  return {
    total_tie_force_kN: +totalTieForceKN.toFixed(2),
    grout_shear_force_kN: +totalGroutShearKN.toFixed(2),
    grout_area_cm2: +totalGroutArea.toFixed(0),
    grout_stress_MPa: +Math.min(999, groutStress).toFixed(3),
    tie_spec: tieSpec,
    tie_count: tieCount,
    tie_safety_factor: +Math.min(9.9, tieSF).toFixed(2),
    grout_safety_factor: +Math.min(9.9, groutSF).toFixed(2),
    force_distribution: { tie_percent: +tiePct.toFixed(0), grout_percent: +groutPct.toFixed(0) },
  };
}

export function computeLoadCases(
  scheme: StackScheme,
  layers: StackLayer[],
  placedStones: PlacedStone[],
  stonesMap: Map<string, Stone>
): LoadCaseResult[] {
  let totalWKg = 0;
  let maxH = 0;
  for (const ps of placedStones) {
    const st = stonesMap.get(ps.stone_id);
    if (!st) continue;
    totalWKg += st.weight_kg;
    maxH = Math.max(maxH, ps.pos_z + st.height_cm);
  }
  const totalWKN = totalWKg * 9.81 / 1000;
  const baseWidth = scheme.base_width_cm;
  const liveAreaM2 = (scheme.base_length_cm / 100) * (scheme.base_width_cm / 100);
  const liveKN = LIVE_LOAD_KN_M2 * liveAreaM2 * 0.4;

  const results: LoadCaseResult[] = [];
  for (const sc of SEISMIC_COEFFICIENTS) {
    const lateralKN = sc.type === '游人荷载'
      ? liveKN
      : (totalWKN + liveKN) * sc.coeff;
    const heightM = maxH / 100;
    const resistingM = (totalWKN + liveKN) * (baseWidth / 100) / 2;
    const overturnM = lateralKN * (heightM * 0.6 + 0.5);
    const sf = overturnM > 0 ? resistingM / overturnM : 9.9;
    results.push({
      case_type: sc.type,
      lateral_force_kN: +lateralKN.toFixed(2),
      total_weight_kN: +(totalWKN + liveKN).toFixed(2),
      base_width_cm: baseWidth,
      height_cm: +maxH.toFixed(0),
      resisting_moment_kNm: +resistingM.toFixed(2),
      overturning_moment_kNm: +overturnM.toFixed(2),
      safety_factor: +Math.min(9.9, sf).toFixed(2),
      is_safe: sf >= REQUIRED_OVERTURNING_SAFETY,
    });
  }
  return results;
}

export function generateWarnings(
  cgResult: CenterOfGravityResult | null,
  overhangs: OverhangMomentResult[],
  stresses: ContactStressResult[],
  tieResult: TieAndGroutResult | null,
  loadCases: LoadCaseResult[],
  placedStones: PlacedStone[],
  stonesMap: Map<string, Stone>
): WarningItem[] {
  const warnings: WarningItem[] = [];
  const pushW = (w: Omit<WarningItem, 'id'>) => warnings.push({ ...w, id: `w_${warnings.length}_${Date.now()}` });

  if (cgResult && !cgResult.is_within_support) {
    pushW({
      level: 'danger',
      category: '重心',
      title: '整体重心越出基底支撑面',
      description: `重心投影超出基底边缘 ${Math.abs(cgResult.nearest_edge_distance_cm).toFixed(1)}cm，稳定裕度 ${cgResult.stability_margin_percent}%`,
      suggestion: '重新布置底层压脚石，扩大基底支撑面；或调整上方山石位置向中心靠拢。',
    });
  }
  if (cgResult && cgResult.is_within_support && cgResult.stability_margin_percent < 15) {
    pushW({
      level: 'warning',
      category: '重心',
      title: '重心接近支撑边缘',
      description: `稳定裕度仅 ${cgResult.stability_margin_percent}%，距最近边缘 ${cgResult.nearest_edge_distance_cm}cm`,
      suggestion: '适当增加压脚石配重，或降低上层山石重量，提高安全储备。',
    });
  }

  let totalBase = 0, totalTop = 0;
  const sorted = [...placedStones].sort((a, b) => a.pos_z - b.pos_z);
  for (let i = 0; i < sorted.length; i++) {
    const st = stonesMap.get(sorted[i].stone_id);
    if (!st) continue;
    if (i < Math.ceil(sorted.length / 2)) totalBase += st.weight_kg;
    else totalTop += st.weight_kg;
  }
  if (totalBase > 0 && totalTop / totalBase > 1.0) {
    pushW({
      level: 'danger',
      category: '配重',
      title: '头重脚轻配重失衡',
      description: `上部累计重量 ${totalTop.toFixed(0)}kg 超过下部 ${totalBase.toFixed(0)}kg，比例 ${(totalTop / totalBase * 100).toFixed(0)}%`,
      suggestion: '遵循"下重上轻"原则，底部增加大吨位黄石或增加压脚石层数。',
    });
  }

  for (const oh of overhangs) {
    if (oh.overhang_type !== '无' && !oh.counterweight_sufficient) {
      pushW({
        level: 'danger',
        category: '悬挑',
        title: `挑石「${oh.stone_name}」配重不足`,
        description: `悬挑 ${oh.overhang_length_cm}cm，倾覆力矩 ${oh.overturning_moment_Nm}Nm，现有配重 ${oh.counterweight_kg}kg，需 ${oh.required_counterweight_kg}kg`,
        related_stone_id: oh.placed_stone_id,
        suggestion: '在悬挑对侧增设压脚石，或采用燕尾榫/铁扁担拉结，必要时缩短悬挑长度。',
      });
    } else if (oh.overhang_length_cm > 35) {
      pushW({
        level: 'warning',
        category: '悬挑',
        title: `「${oh.stone_name}」悬挑长度偏大`,
        description: `悬挑 ${oh.overhang_length_cm}cm 超过 35cm 经验阈值，安全系数 ${oh.safety_factor}`,
        related_stone_id: oh.placed_stone_id,
        suggestion: '建议增设隐式拉结铁件，底部加灌浆并预留沉降观察点。',
      });
    }
  }

  for (const s of stresses) {
    if (s.is_cracking_risk) {
      pushW({
        level: 'danger',
        category: '接触应力',
        title: `「${s.stone_name}」压裂风险`,
        description: `压应力 ${s.normal_stress_MPa}MPa / 剪应力 ${s.shear_stress_MPa}MPa，抗压安全系数仅 ${s.compressive_safety_factor}`,
        related_stone_id: s.placed_stone_id,
        suggestion: '在搭接点垫塞铁片或打磨增大接触面积，采用高标号水泥砂浆找平。',
      });
    }
    if (s.contact_count <= 1 && s.total_contact_area_cm2 < 60) {
      pushW({
        level: 'warning',
        category: '支撑',
        title: `「${s.stone_name}」单点支撑`,
        description: `仅 ${s.contact_count} 个搭接点，接触面积 ${s.total_contact_area_cm2}cm² 偏小`,
        related_stone_id: s.placed_stone_id,
        suggestion: '遵循"一石三居"原则，至少设置 2-3 个受力点并打刹稳固。',
      });
    }
  }

  if (tieResult && tieResult.tie_count > 0 && tieResult.tie_safety_factor < 1.8) {
    pushW({
      level: 'warning',
      category: '拉结',
      title: '拉结铁件安全储备偏低',
      description: `当前 ${tieResult.tie_spec} × ${tieResult.tie_count} 根，总受力 ${tieResult.total_tie_force_kN}kN，安全系数 ${tieResult.tie_safety_factor}`,
      suggestion: '升级铁件规格或增加数量，按"二接一拉"原则补充副拉。',
    });
  }

  for (const lc of loadCases) {
    if (!lc.is_safe) {
      pushW({
        level: lc.case_type.startsWith('地震') ? 'danger' : 'warning',
        category: '工况',
        title: `${lc.case_type} 下倾覆安全不达标`,
        description: `倾覆力矩 ${lc.overturning_moment_kNm}kNm，抗力 ${lc.resisting_moment_kNm}kNm，系数 ${lc.safety_factor} < 1.5`,
        suggestion: '降低假山高度或扩大底部底座，增强山体整体性，加设横向拉结梁。',
      });
    }
  }

  return warnings;
}
