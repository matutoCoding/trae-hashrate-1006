import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VerificationReport } from '@/types/project';
import { generateID } from '@/utils/geometry';
import type {
  CenterOfGravityResult,
  OverhangMomentResult,
  ContactStressResult,
  TieAndGroutResult,
  LoadCaseResult,
  WarningItem,
} from '@/types/calc';

interface ReportState {
  reports: VerificationReport[];

  addReport: (r: Omit<VerificationReport, 'id' | 'generated_at'>) => VerificationReport;
  removeReport: (id: string) => void;
  getReportsForProject: (projectId: string) => VerificationReport[];
  getLatestReport: (projectId: string) => VerificationReport | null;
  clearReports: (projectId?: string) => void;
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: [],

      addReport: (data) => {
        const report: VerificationReport = {
          ...data,
          id: generateID('rpt'),
          generated_at: Date.now(),
        };
        set((s) => ({ reports: [report, ...s.reports] }));
        return report;
      },

      removeReport: (id) =>
        set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),

      getReportsForProject: (projectId) =>
        get()
          .reports.filter((r) => r.project_id === projectId)
          .sort((a, b) => b.generated_at - a.generated_at),

      getLatestReport: (projectId) => {
        const list = get().getReportsForProject(projectId);
        return list.length > 0 ? list[0] : null;
      },

      clearReports: (projectId) =>
        set((s) => ({
          reports: projectId ? s.reports.filter((r) => r.project_id !== projectId) : [],
        })),
    }),
    { name: 'dieshan-report-store' }
  )
);

export interface ReportBuildInput {
  projectId: string;
  schemeId: string;
  reportName: string;
  operator?: string;
  cgResult: CenterOfGravityResult;
  overhangs: OverhangMomentResult[];
  contactStresses: ContactStressResult[];
  tieGrout: TieAndGroutResult;
  loadCases: LoadCaseResult[];
  warnings: WarningItem[];
  placedStones: { id: string; name: string; code: string }[];
}

export function buildVerificationReport(input: ReportBuildInput): Omit<VerificationReport, 'id' | 'generated_at'> {
  const { cgResult, overhangs, contactStresses, tieGrout, loadCases, warnings } = input;

  const realOverhangs = overhangs.filter((o) => o.overhang_type !== '无');
  const maxOverhang = realOverhangs.reduce(
    (m, o) => Math.max(m, o.overhang_length_cm),
    0
  );
  const maxOverturning = realOverhangs.reduce(
    (m, o) => Math.max(m, o.overturning_moment_Nm),
    0
  );
  const totalRequiredCW = realOverhangs.reduce(
    (m, o) => Math.max(m, o.required_counterweight_kg),
    0
  );
  const totalAvailableCW = realOverhangs.reduce(
    (m, o) => Math.max(m, o.counterweight_kg),
    0
  );
  const minCantileverSF = realOverhangs.length > 0
    ? Math.min(...realOverhangs.map((o) => Number(o.safety_factor)))
    : 99;

  const loadCasesReport = loadCases.map((lc) => ({
    case_name: lc.case_name,
    case_description: lc.description ?? '',
    horizontal_force_kn: +lc.horizontal_force_kN.toFixed(2),
    total_load_kn: +lc.total_load_kN.toFixed(2),
    resisting_moment_kNm: +lc.resisting_moment_kNm.toFixed(2),
    overturning_moment_kNm: +lc.overturning_moment_kNm.toFixed(2),
    safety_factor: +lc.safety_factor.toFixed(2),
    status: (lc.safety_factor >= 1.5 ? 'pass' : lc.safety_factor >= 1.2 ? 'marginal' : 'fail') as
      | 'pass'
      | 'marginal'
      | 'fail',
  }));

  const contact_stresses = contactStresses.map((cs) => ({
    placed_stone_id: cs.placed_stone_id,
    stone_name: input.placedStones.find((x) => x.id === cs.placed_stone_id)?.name ?? '未知石',
    stone_code: input.placedStones.find((x) => x.id === cs.placed_stone_id)?.code ?? '??',
    max_stress_mpa: +cs.normal_stress_MPa.toFixed(3),
    avg_stress_mpa: +cs.normal_stress_MPa.toFixed(3),
    contact_area_cm2: +cs.total_contact_area_cm2.toFixed(1),
    supporting_stones: [] as string[],
    status: (cs.normal_stress_MPa < 8 ? 'safe' : cs.normal_stress_MPa < 15 ? 'warning' : 'danger') as
      | 'safe'
      | 'warning'
      | 'danger',
  }));

  const hasDanger =
    warnings.some((w) => w.level === 'danger') ||
    loadCasesReport.some((lc) => lc.status === 'fail');
  const hasWarn =
    warnings.some((w) => w.level === 'warning') ||
    loadCasesReport.some((lc) => lc.status === 'marginal');

  const overall_verdict = hasDanger ? '待优化' : hasWarn ? '基本合格' : '合格';
  const minSF = Math.min(...loadCasesReport.map((l) => l.safety_factor), minCantileverSF);
  const overall_score = Math.max(
    0,
    Math.round(
      Math.min(
        100,
        60 +
          (minSF - 1.2) * 20 +
          (cgResult.distance_to_nearest_edge_cm / Math.max(cgResult.total_weight_kg, 1)) * 10 -
          warnings.filter((w) => w.level === 'danger').length * 10 -
          warnings.filter((w) => w.level === 'warning').length * 3
      )
    )
  );

  return {
    project_id: input.projectId,
    scheme_id: input.schemeId,
    name: input.reportName,
    operator: input.operator,

    center_of_gravity: {
      cg_x_cm: +cgResult.cg_x_cm.toFixed(2),
      cg_y_cm: +cgResult.cg_y_cm.toFixed(2),
      cg_z_cm: +cgResult.cg_z_cm.toFixed(2),
      eccentricity_x_cm: +cgResult.eccentricity_x_cm.toFixed(2),
      eccentricity_y_cm: +cgResult.eccentricity_y_cm.toFixed(2),
      distance_to_nearest_edge_cm: +cgResult.distance_to_nearest_edge_cm.toFixed(2),
      layer_cgs: cgResult.layer_cgs.map((l) => ({
        layer_id: l.layer_id,
        layer_name: l.layer_name,
        cg_x: +l.cg_x.toFixed(2),
        cg_y: +l.cg_y.toFixed(2),
        cg_z: +l.cg_z.toFixed(2),
        weight_kg: +l.weight_kg.toFixed(1),
      })),
      total_weight_kg: +cgResult.total_weight_kg.toFixed(1),
    },

    cantilever: {
      has_cantilever: realOverhangs.length > 0,
      max_overhang_cm: +maxOverhang.toFixed(1),
      overturning_moment_nm: +maxOverturning.toFixed(1),
      available_counterweight_kg: +totalAvailableCW.toFixed(1),
      required_counterweight_kg: +totalRequiredCW.toFixed(1),
      safety_factor: +Math.min(9.9, minCantileverSF).toFixed(2),
    },

    contact_stresses,

    tie_grout: {
      tie_points_count: tieGrout.tie_count,
      grout_seams_count: tieGrout.tie_count > 0 ? tieGrout.tie_count + 2 : 0,
      tie_safety_factor: +tieGrout.tie_safety_factor.toFixed(2),
      grout_safety_factor: +tieGrout.grout_safety_factor.toFixed(2),
      load_share_ratio_tie: +(tieGrout.force_distribution.tie_percent / 100).toFixed(2),
      load_share_ratio_grout: +(tieGrout.force_distribution.grout_percent / 100).toFixed(2),
      load_share_ratio_stone: +(tieGrout.force_distribution.stone_percent / 100).toFixed(2),
    },

    load_cases: loadCasesReport,

    warnings: warnings.map((w) => ({
      level: w.level,
      code: `${w.category?.slice(0, 2) ?? 'WARN'}-${w.id.slice(-3)}`,
      title: w.title,
      detail: w.description,
      suggestion: w.suggestion,
    })),

    overall_verdict,
    overall_score,
  };
}

export function exportReportAsText(report: VerificationReport): string {
  const fmtDate = (ts: number) => new Date(ts).toLocaleString('zh-CN');
  const lines: string[] = [];
  lines.push('╔══════════════════════════════════════════════════════════════════╗');
  lines.push('║          古典园林叠石假山 · 结构校核报告                         ║');
  lines.push('╚══════════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`报告编号   : ${report.id}`);
  lines.push(`报告名称   : ${report.name}`);
  lines.push(`生成时间   : ${fmtDate(report.generated_at)}`);
  lines.push(`校核人员   : ${report.operator ?? '未记录'}`);
  lines.push(`项目ID     : ${report.project_id}`);
  lines.push(`方案ID     : ${report.scheme_id}`);
  lines.push('');
  lines.push('─────────────────────────────── 总体结论 ───────────────────────────────');
  lines.push(`  综合评定  : ${report.overall_verdict}`);
  lines.push(`  综合评分  : ${report.overall_score} / 100`);
  lines.push('');
  lines.push('─────────────────────────────── 重心校核 ───────────────────────────────');
  const cg = report.center_of_gravity;
  lines.push(`  总重量         : ${cg.total_weight_kg} kg`);
  lines.push(`  重心坐标       : X=${cg.cg_x_cm}cm, Y=${cg.cg_y_cm}cm, Z=${cg.cg_z_cm}cm`);
  lines.push(`  偏心距 (X/Y)   : ${cg.eccentricity_x_cm}cm / ${cg.eccentricity_y_cm}cm`);
  lines.push(`  距最近边缘     : ${cg.distance_to_nearest_edge_cm} cm`);
  lines.push('  分层重心:');
  for (const l of cg.layer_cgs) {
    lines.push(
      `    · ${l.layer_name.padEnd(10)} W=${String(l.weight_kg).padStart(8)}kg  CG=(${l.cg_x}, ${l.cg_y}, ${l.cg_z})`
    );
  }
  lines.push('');
  lines.push('───────────────────────────── 悬挑配重核算 ─────────────────────────────');
  const ca = report.cantilever;
  if (!ca.has_cantilever) {
    lines.push('  本方案无悬挑结构。');
  } else {
    lines.push(`  最大悬挑长度     : ${ca.max_overhang_cm} cm`);
    lines.push(`  倾覆力矩         : ${ca.overturning_moment_nm} N·m`);
    lines.push(`  现有配重         : ${ca.available_counterweight_kg} kg`);
    lines.push(`  理论需配重       : ${ca.required_counterweight_kg} kg`);
    lines.push(`  安全系数         : ${ca.safety_factor}`);
  }
  lines.push('');
  lines.push('──────────────────────────── 接触应力分析 ────────────────────────────');
  lines.push('  石名          石号     最大应力(MPa)  平均(MPa)  接触面积(cm²)   状态');
  for (const c of report.contact_stresses) {
    const flag = c.status === 'safe' ? '✓安全' : c.status === 'warning' ? '⚠注意' : '✗超限';
    lines.push(
      `  ${c.stone_name.padEnd(12)}${c.stone_code.padEnd(8)}${String(c.max_stress_mpa).padStart(
        12
      )}${String(c.avg_stress_mpa).padStart(12)}${String(c.contact_area_cm2).padStart(
        14
      )}   ${flag}`
    );
  }
  lines.push('');
  lines.push('─────────────────────────── 拉结铁件与灌浆 ───────────────────────────');
  const tg = report.tie_grout;
  lines.push(`  拉结点数量         : ${tg.tie_points_count}`);
  lines.push(`  灌浆缝数量         : ${tg.grout_seams_count}`);
  lines.push(`  拉结安全系数       : ${tg.tie_safety_factor}`);
  lines.push(`  灌浆安全系数       : ${tg.grout_safety_factor}`);
  lines.push(
    `  受力分担           : 石体 ${(tg.load_share_ratio_stone * 100).toFixed(0)}% / 拉结 ${(
      tg.load_share_ratio_tie * 100
    ).toFixed(0)}% / 灌浆 ${(tg.load_share_ratio_grout * 100).toFixed(0)}%`
  );
  lines.push('');
  lines.push('─────────────────────────── 多工况倾覆系数 ───────────────────────────');
  lines.push('  工况            水平力(kN)   抗倾覆力矩     倾覆力矩      安全系数    结果');
  for (const lc of report.load_cases) {
    const flag = lc.status === 'pass' ? '✓通过' : lc.status === 'marginal' ? '⚠临界' : '✗不通过';
    lines.push(
      `  ${lc.case_name.padEnd(14)}${String(lc.horizontal_force_kn).padStart(
        10
      )}${String(lc.resisting_moment_kNm).padStart(14)}${String(lc.overturning_moment_kNm).padStart(
        14
      )}${String(lc.safety_factor).padStart(12)}    ${flag}`
    );
  }
  lines.push('');
  lines.push('────────────────────────────── 隐患告警 ──────────────────────────────');
  if (report.warnings.length === 0) {
    lines.push('  ✓ 未检测到结构隐患。');
  } else {
    for (const w of report.warnings) {
      const tag = w.level === 'danger' ? '【严重】' : w.level === 'warning' ? '【警告】' : '【提示】';
      lines.push(`  ${tag} ${w.title}`);
      lines.push(`       ${w.detail}`);
      lines.push(`       建议: ${w.suggestion}`);
      lines.push('');
    }
  }
  lines.push('');
  lines.push('═════════════════════════════ 报告结束 ═════════════════════════════════');
  return lines.join('\n');
}
