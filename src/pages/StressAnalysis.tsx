import { useEffect, useMemo, useState } from 'react';
import Header, { ActionButton } from '@/components/layout/Header';
import { useStoneStore } from '@/store/stoneStore';
import { useStackStore } from '@/store/stackStore';
import {
  computeOverhangMoments,
  computeContactStresses,
  computeTieAndGrout,
  computeLoadCases,
  generateWarnings,
} from '@/utils/mechanics';
import { computeCenterOfGravity } from '@/utils/geometry';
import GaugeMeter from '@/components/GaugeMeter';
import SealStamp from '@/components/SealStamp';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Triangle,
  Square,
  Hexagon,
  Mountain,
  Waves,
  Gauge,
  ShieldAlert,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { WarningItem } from '@/types/calc';

export default function StressAnalysis() {
  const { stones, getStoneMap } = useStoneStore();
  const store = useStackStore();
  const scheme = store.schemes.find(s => s.id === store.currentSchemeId)
    ?? (store.schemes.length === 0 ? store.createScheme('默认假山方案', '示例方案', 600, 400) : store.schemes[0]);

  const layers = store.getLayersForScheme(scheme.id);
  const placed = store.getPlacedForScheme(scheme.id);
  const stoneMap = getStoneMap();

  const [selectedWarning, setSelectedWarning] = useState<string | null>(null);

  useEffect(() => {
    if (layers.length === 0) {
      store.addLayer('基础层', '基座层', 0);
      store.addLayer('主山层', '主峰层', 80);
      store.addLayer('中层', '配石中层', 200);
      store.addLayer('顶峦层', '收顶层', 320);
    }
  }, [layers.length, store]);

  useEffect(() => {
    if (placed.length === 0 && stones.length >= 5) {
      const lids = layers.map(l => l.id);
      if (lids.length >= 4) {
        const p1 = store.placeStone({ stone_id: stones[1]?.id ?? stones[0].id, layer_id: lids[0], pos_x: 50, pos_y: 120, pos_z: 0, support_type: '叠' });
        const p2 = store.placeStone({ stone_id: stones[3]?.id ?? stones[0].id, layer_id: lids[0], pos_x: 380, pos_y: 120, pos_z: 0, support_type: '叠' });
        const p3 = store.placeStone({ stone_id: stones[0]?.id ?? stones[0].id, layer_id: lids[1], pos_x: 200, pos_y: 140, pos_z: 85, support_type: '竖', supported_by: [p1.id, p2.id] });
        store.placeStone({ stone_id: stones[2]?.id ?? stones[0].id, layer_id: lids[2], pos_x: 350, pos_y: 150, pos_z: 210, support_type: '挑', supported_by: [p3.id], has_tie: true, has_grout: true });
        store.placeStone({ stone_id: stones[7]?.id ?? stones[0].id, layer_id: lids[3], pos_x: 220, pos_y: 140, pos_z: 330, support_type: '安', supported_by: [p3.id] });
      }
    }
  }, [placed.length, stones, layers, store]);

  const cgResult = useMemo(
    () => computeCenterOfGravity(scheme, layers, placed, stoneMap),
    [scheme, layers, placed, stoneMap]
  );

  const overhangs = useMemo(
    () => computeOverhangMoments(placed, stoneMap, scheme.base_length_cm),
    [placed, stoneMap, scheme.base_length_cm]
  );

  const stresses = useMemo(
    () => computeContactStresses(placed, stoneMap),
    [placed, stoneMap]
  );

  const tieGrout = useMemo(
    () => computeTieAndGrout(overhangs, placed),
    [overhangs, placed]
  );

  const loadCases = useMemo(
    () => computeLoadCases(scheme, layers, placed, stoneMap),
    [scheme, layers, placed, stoneMap]
  );

  const warnings = useMemo(
    () => generateWarnings(cgResult, overhangs, stresses, tieGrout, loadCases, placed, stoneMap),
    [cgResult, overhangs, stresses, tieGrout, loadCases, placed, stoneMap]
  );

  const dangerCount = warnings.filter(w => w.level === 'danger').length;
  const warningCount = warnings.filter(w => w.level === 'warning').length;
  const infoCount = warnings.filter(w => w.level === 'info').length;

  const overallSafe = dangerCount === 0 && loadCases.every(l => l.is_safe);

  const WarningIcon = ({ level }: { level: WarningItem['level'] }) => {
    if (level === 'danger') return <XCircle className="w-5 h-5 text-cinnabar-600 shrink-0" />;
    if (level === 'warning') return <AlertTriangle className="w-5 h-5 text-ochre-600 shrink-0" />;
    return <CheckCircle2 className="w-5 h-5 text-pine-600 shrink-0" />;
  };

  const WarningBorder = ({ level }: { level: WarningItem['level'] }) => {
    if (level === 'danger') return 'border-l-cinnabar-500 bg-cinnabar-50/60';
    if (level === 'warning') return 'border-l-ochre-500 bg-ochre-50/60';
    return 'border-l-pine-500 bg-pine-50/60';
  };

  const stressColor = (sf: number) => {
    if (sf >= 3) return 'bg-pine-500';
    if (sf >= 1.5) return 'bg-ochre-500';
    return 'bg-cinnabar-500';
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="受力诊断"
        subtitle={`${scheme.name} · 悬挑${overhangs.filter(o => o.overhang_type !== '无').length}处 · 接触点${stresses.length}个 · 工况${loadCases.length}种`}
        actions={
          <>
            <ActionButton icon={RefreshCw} variant="ghost">重新计算</ActionButton>
            <ActionButton icon={Download} variant="secondary">导出报告</ActionButton>
            <ActionButton icon={ShieldAlert}>
              诊断中心
              {dangerCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-cinnabar-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {dangerCount}
                </span>
              )}
            </ActionButton>
          </>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* 顶部总体状态 */}
        <div className="scroll-card mb-6">
          <div className="flex items-center justify-between p-6 border-b border-ink-200">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${overallSafe ? 'bg-pine-100' : 'bg-cinnabar-100'}`}>
                {overallSafe ? (
                  <ShieldAlert className="w-8 h-8 text-pine-700" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-cinnabar-700" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold font-song text-ink-900">
                  {overallSafe ? '整体结构安全' : '检测到结构隐患'}
                </h2>
                <p className="text-ink-600 mt-1">
                  共发现 <span className="text-cinnabar-600 font-semibold">{dangerCount}</span> 项严重问题，
                  <span className="text-ochre-600 font-semibold"> {warningCount}</span> 项警告，
                  <span className="text-pine-600 font-semibold"> {infoCount}</span> 项提示
                </p>
              </div>
            </div>
            <SealStamp status={overallSafe ? 'pass' : dangerCount > 0 ? 'danger' : 'warn'} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 左列：悬挑力矩 + 拉结灌浆 */}
          <div className="col-span-4 space-y-6">
            {/* 悬挑力矩诊断 */}
            <div className="scroll-card">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <Triangle className="w-5 h-5 text-stoneblue-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">悬挑力矩与配重核算</h3>
              </div>
              <div className="p-5 space-y-4">
                {overhangs.filter(o => o.overhang_type !== '无').length === 0 ? (
                  <div className="text-center py-8 text-ink-500">
                    <Triangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>当前堆叠无悬挑悬石</p>
                  </div>
                ) : (
                  overhangs.filter(o => o.overhang_type !== '无').map((oh) => (
                    <div key={oh.placed_stone_id} className={`p-4 rounded-xl border ${oh.counterweight_sufficient ? 'border-pine-200 bg-pine-50/40' : 'border-cinnabar-200 bg-cinnabar-50/40'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded font-semibold ${oh.overhang_type === '挑' ? 'bg-stoneblue-600 text-white' : 'bg-ink-600 text-white'}`}>
                            {oh.overhang_type}
                          </span>
                          <span className="font-bold text-ink-800">{oh.stone_name}</span>
                        </div>
                        <span className={`text-sm font-bold ${oh.safety_factor >= 1.5 ? 'text-pine-700' : 'text-cinnabar-700'}`}>
                          K={oh.safety_factor}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-ink-500 text-xs">悬挑长度</p>
                          <p className="font-bold text-ink-800">{oh.overhang_length_cm} cm</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-ink-500 text-xs">倾覆力矩</p>
                          <p className="font-bold text-ink-800">{oh.overturning_moment_Nm} Nm</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-ink-500 text-xs">现有配重</p>
                          <p className="font-bold text-pine-700">{oh.counterweight_kg} kg</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-ink-500 text-xs">需配重</p>
                          <p className={`font-bold ${oh.counterweight_sufficient ? 'text-pine-700' : 'text-cinnabar-700'}`}>
                            {oh.required_counterweight_kg} kg
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-ink-500 mb-1">
                          <span>配重满足度</span>
                          <span>{Math.min(100, (oh.counterweight_kg / Math.max(1, oh.required_counterweight_kg)) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${oh.counterweight_sufficient ? 'bg-pine-500' : 'bg-cinnabar-500'}`}
                            style={{ width: `${Math.min(100, (oh.counterweight_kg / Math.max(1, oh.required_counterweight_kg)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 拉结铁件与灌浆缝 */}
            <div className="scroll-card">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <Hexagon className="w-5 h-5 text-ochre-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">拉结铁件与灌浆缝</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <GaugeMeter
                    value={tieGrout.tie_safety_factor}
                    max={5}
                    label="拉结安全系数"
                    unit="K拉结"
                    thresholds={{ warn: 2.0, danger: 1.8 }}
                    size={120}
                  />
                  <GaugeMeter
                    value={tieGrout.grout_safety_factor}
                    max={5}
                    label="灌浆安全系数"
                    unit="K灌浆"
                    thresholds={{ warn: 2.0, danger: 1.5 }}
                    size={120}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-ink-50 rounded-xl">
                    <span className="text-ink-600 text-sm">铁件规格</span>
                    <span className="font-bold text-ink-800">{tieGrout.tie_spec}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-ink-50 rounded-xl">
                    <span className="text-ink-600 text-sm">使用数量</span>
                    <span className="font-bold text-ink-800">{tieGrout.tie_count} 处</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-ink-50 rounded-xl">
                    <span className="text-ink-600 text-sm">拉结受力</span>
                    <span className="font-bold text-stoneblue-700">{tieGrout.total_tie_force_kN} kN</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-ink-50 rounded-xl">
                    <span className="text-ink-600 text-sm">灌浆剪切力</span>
                    <span className="font-bold text-ochre-700">{tieGrout.grout_shear_force_kN} kN</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-ink-50 rounded-xl">
                    <span className="text-ink-600 text-sm">灌浆面积</span>
                    <span className="font-bold text-ink-800">{tieGrout.grout_area_cm2} cm²</span>
                  </div>
                </div>
                <div className="mt-5 p-4 bg-gradient-to-r from-stoneblue-50 to-ochre-50 rounded-xl">
                  <p className="text-xs text-ink-600 mb-2 font-semibold">受力分担比例</p>
                  <div className="flex gap-2 h-8 rounded-lg overflow-hidden">
                    <div
                      className="bg-stoneblue-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                      style={{ width: `${tieGrout.force_distribution.tie_percent}%` }}
                    >
                      铁件 {tieGrout.force_distribution.tie_percent}%
                    </div>
                    <div
                      className="bg-ochre-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                      style={{ width: `${tieGrout.force_distribution.grout_percent}%` }}
                    >
                      灌浆 {tieGrout.force_distribution.grout_percent}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 中列：接触应力 + 工况分析 */}
          <div className="col-span-5 space-y-6">
            {/* 接触应力热力表 */}
            <div className="scroll-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
                <div className="flex items-center gap-2">
                  <Square className="w-5 h-5 text-pine-600" />
                  <h3 className="font-bold font-song text-lg text-ink-800">石与石接触应力分析</h3>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pine-500" />安全(≥3.0)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-ochre-500" />注意(≥1.5)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cinnabar-500" />危险(&lt;1.5)</span>
                </div>
              </div>
              <div className="p-5">
                {stresses.length === 0 ? (
                  <div className="text-center py-10 text-ink-500">
                    <Square className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>暂无应力数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-ink-500 border-b border-ink-200">
                          <th className="text-left py-2 px-3 font-semibold">石名</th>
                          <th className="text-center py-2 px-3 font-semibold">搭接点</th>
                          <th className="text-center py-2 px-3 font-semibold">接触面积</th>
                          <th className="text-center py-2 px-3 font-semibold">压应力</th>
                          <th className="text-center py-2 px-3 font-semibold">剪应力</th>
                          <th className="text-center py-2 px-3 font-semibold">K抗压</th>
                          <th className="text-center py-2 px-3 font-semibold">压裂</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stresses.map((s) => (
                          <tr key={s.placed_stone_id} className="border-b border-ink-100 hover:bg-ink-50 transition-colors">
                            <td className="py-2 px-3 font-semibold text-ink-800">{s.stone_name}</td>
                            <td className="py-2 px-3 text-center text-ink-600">{s.contact_count}</td>
                            <td className="py-2 px-3 text-center text-ink-600">{s.total_contact_area_cm2}cm²</td>
                            <td className="py-2 px-3 text-center font-mono text-ink-700">{s.normal_stress_MPa}MPa</td>
                            <td className="py-2 px-3 text-center font-mono text-ink-700">{s.shear_stress_MPa}MPa</td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-ink-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${stressColor(s.compressive_safety_factor)}`} style={{ width: `${Math.min(100, s.compressive_safety_factor * 20)}%` }} />
                                </div>
                                <span className={`text-xs font-bold ${s.compressive_safety_factor >= 1.5 ? 'text-pine-700' : 'text-cinnabar-700'}`}>
                                  {s.compressive_safety_factor}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {s.is_cracking_risk ? (
                                <span className="px-2 py-0.5 rounded-full bg-cinnabar-100 text-cinnabar-700 text-xs font-bold">风险</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-pine-100 text-pine-700 text-xs font-bold">安全</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 工况倾覆安全系数 */}
            <div className="scroll-card">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <Waves className="w-5 h-5 text-cinnabar-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">游人荷载与地震工况</h3>
                <span className="ml-auto text-xs text-ink-500">倾覆安全系数 ≥ 1.5 为合格</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  {loadCases.map((lc) => (
                    <div key={lc.case_type} className={`p-4 rounded-xl border-2 ${lc.is_safe ? 'border-pine-200 bg-gradient-to-br from-pine-50 to-white' : 'border-cinnabar-200 bg-gradient-to-br from-cinnabar-50 to-white'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {lc.case_type.startsWith('地震') ? (
                            <Mountain className="w-4 h-4 text-cinnabar-600" />
                          ) : (
                            <Gauge className="w-4 h-4 text-stoneblue-600" />
                          )}
                          <span className="font-bold text-ink-800">{lc.case_type}</span>
                        </div>
                        <SealStamp status={lc.is_safe ? 'pass' : 'danger'} size="sm" text={lc.is_safe ? '合格' : '不足'} />
                      </div>
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <p className="text-xs text-ink-500">倾覆系数</p>
                          <p className={`text-3xl font-bold font-song ${lc.is_safe ? 'text-pine-700' : 'text-cinnabar-700'}`}>
                            {lc.safety_factor}
                          </p>
                        </div>
                        <div className="w-20 h-14 relative">
                          <svg viewBox="0 0 80 56" className="w-full h-full">
                            <line x1="5" y1="48" x2="75" y2="48" stroke="#e7e5e4" strokeWidth="2" />
                            <line x1="24" y1="48" x2="24" y2="8" stroke="#c2410c" strokeWidth="1.5" strokeDasharray="3,2" />
                            <rect
                              x="10"
                              y={48 - Math.min(40, lc.safety_factor * 8)}
                              width="12"
                              height={Math.min(40, lc.safety_factor * 8)}
                              rx="2"
                              fill={lc.is_safe ? '#4a9b83' : '#c2410c'}
                            />
                            <text x="16" y="54" fontSize="9" textAnchor="middle" fill="#78716c">K=1.5</text>
                          </svg>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/60 rounded-lg p-2">
                          <p className="text-ink-500">水平力</p>
                          <p className="font-bold text-ink-700">{lc.lateral_force_kN} kN</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2">
                          <p className="text-ink-500">总荷重</p>
                          <p className="font-bold text-ink-700">{lc.total_weight_kN} kN</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2">
                          <p className="text-ink-500">抗力矩</p>
                          <p className="font-bold text-pine-700">{lc.resisting_moment_kNm} kNm</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2">
                          <p className="text-ink-500">倾覆矩</p>
                          <p className="font-bold text-cinnabar-700">{lc.overturning_moment_kNm} kNm</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右列：告警中心 */}
          <div className="col-span-3">
            <div className="scroll-card sticky top-6">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <ShieldAlert className="w-5 h-5 text-cinnabar-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">失稳隐患告警</h3>
              </div>
              <div className="p-4 max-h-[70vh] overflow-auto space-y-3">
                {warnings.length === 0 ? (
                  <div className="text-center py-10 text-ink-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-pine-400" />
                    <p className="font-semibold text-pine-700">未检测到隐患</p>
                    <p className="text-xs mt-1">结构整体稳定可靠</p>
                  </div>
                ) : (
                  warnings.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWarning(selectedWarning === w.id ? null : w.id)}
                      className={`border-l-4 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${WarningBorder({ level: w.level })} ${selectedWarning === w.id ? 'ring-2 ring-offset-1 ring-ink-300' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <WarningIcon level={w.level} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 text-ink-600 font-semibold">
                              {w.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-ink-800 mt-1.5 text-sm">{w.title}</h4>
                          <p className="text-xs text-ink-600 mt-1 leading-relaxed">{w.description}</p>
                          {selectedWarning === w.id && (
                            <div className="mt-3 p-3 bg-white/80 rounded-lg border border-ink-100">
                              <p className="text-xs font-semibold text-ink-700 mb-1">💡 处理建议</p>
                              <p className="text-xs text-ink-600 leading-relaxed">{w.suggestion}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
