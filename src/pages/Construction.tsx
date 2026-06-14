import { useEffect, useMemo, useState } from 'react';
import Header, { ActionButton } from '@/components/layout/Header';
import { useStoneStore } from '@/store/stoneStore';
import { useStackStore } from '@/store/stackStore';
import { useProjectStore } from '@/store/projectStore';
import { useConstructionStore } from '@/store/constructionStore';
import { generateConstructionSequence, computeAestheticScore } from '@/utils/aesthetics';
import { computeCenterOfGravity } from '@/utils/geometry';
import { generateWarnings, computeOverhangMoments } from '@/utils/mechanics';
import SealStamp from '@/components/SealStamp';
import RadarChart from '@/components/RadarChart';
import { MATERIAL_NAMES } from '@/types/stone';
import ConstructionBriefingModal from '@/components/ConstructionBriefingModal';
import {
  ListOrdered,
  Hammer,
  Mountain,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Link,
  Droplets,
  Download,
  Printer,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Clock,
  User,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { ConstructionStep, WarningItem } from '@/types/calc';

export default function Construction() {
  const stoneStore = useStoneStore();
  const stackStore = useStackStore();
  const projectStore = useProjectStore();
  const currentPrj = projectStore.ensureDefaultProject();
  const projectId = currentPrj.id;
  const constructionStore = useConstructionStore();

  useEffect(() => {
    stoneStore.ensureStonesForProject(projectId);
    stackStore.ensureSchemeForProject(projectId, currentPrj.base_dimensions.length_cm, currentPrj.base_dimensions.width_cm);
  }, [projectId]);

  const scheme = stackStore.ensureSchemeForProject(projectId, currentPrj.base_dimensions.length_cm, currentPrj.base_dimensions.width_cm);

  const stones = stoneStore.getStonesForProject(projectId);
  const stoneMap = stoneStore.getStoneMapForProject(projectId);
  const placed = stackStore.getPlacedForScheme(scheme.id);
  const layers = stackStore.getLayersForScheme(scheme.id);

  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [showBriefing, setShowBriefing] = useState(false);

  useEffect(() => {
    if (layers.length === 0) {
      stackStore.addLayer('基础层', '基座层', 0);
      stackStore.addLayer('主山层', '主峰层', 80);
      stackStore.addLayer('中层', '配石中层', 200);
      stackStore.addLayer('顶峦层', '收顶层', 320);
    }
  }, [layers.length, stackStore]);

  useEffect(() => {
    if (placed.length === 0 && stones.length >= 5) {
      const lids = layers.map(l => l.id);
      if (lids.length >= 4) {
        const p1 = stackStore.placeStone({ stone_id: stones[1]?.id ?? stones[0].id, layer_id: lids[0], pos_x: 50, pos_y: 120, pos_z: 0, support_type: '叠' });
        const p2 = stackStore.placeStone({ stone_id: stones[3]?.id ?? stones[0].id, layer_id: lids[0], pos_x: 380, pos_y: 120, pos_z: 0, support_type: '叠' });
        const p3 = stackStore.placeStone({ stone_id: stones[0]?.id ?? stones[0].id, layer_id: lids[1], pos_x: 200, pos_y: 140, pos_z: 85, support_type: '竖', supported_by: [p1.id, p2.id] });
        stackStore.placeStone({ stone_id: stones[2]?.id ?? stones[0].id, layer_id: lids[2], pos_x: 350, pos_y: 150, pos_z: 210, support_type: '挑', supported_by: [p3.id], has_tie: true, has_grout: true });
        stackStore.placeStone({ stone_id: stones[7]?.id ?? stones[0].id, layer_id: lids[3], pos_x: 220, pos_y: 140, pos_z: 330, support_type: '安', supported_by: [p3.id] });
      }
    }
  }, [placed.length, stones, layers, stackStore]);

  useEffect(() => {
    if (scheme.id && layers.length > 0) {
      constructionStore.initializeRecords(projectId, scheme.id, placed, stoneMap, layers);
    }
  }, [projectId, scheme.id, placed.length, layers.length]);

  const progress = constructionStore.getProgress(projectId, scheme.id);

  const steps = useMemo(
    () => generateConstructionSequence(placed, stoneMap, layers),
    [placed, stoneMap, layers]
  );

  const aesthetic = useMemo(
    () => computeAestheticScore(placed, stoneMap, layers),
    [placed, stoneMap, layers]
  );

  const cgResult = useMemo(
    () => computeCenterOfGravity(scheme, layers, placed, stoneMap),
    [scheme, layers, placed, stoneMap]
  );

  const overhangs = useMemo(
    () => computeOverhangMoments(placed, stoneMap, scheme.base_length_cm),
    [placed, stoneMap, scheme.base_length_cm]
  );

  const warnings = useMemo(
    () => generateWarnings(cgResult, overhangs, [], null, [], placed, stoneMap),
    [cgResult, overhangs, placed, stoneMap]
  ).filter(w => w.level !== 'info');

  const totalWeight = placed.reduce((s, p) => s + (stoneMap.get(p.stone_id)?.weight_kg ?? 0), 0);
  const maxH = placed.reduce((m, p) => {
    const st = stoneMap.get(p.stone_id);
    return Math.max(m, p.pos_z + (st?.height_cm ?? 0));
  }, 0);

  const layerGroups = useMemo(() => {
    const groups = new Map<string, ConstructionStep[]>();
    for (const step of steps) {
      if (!groups.has(step.layer_name)) groups.set(step.layer_name, []);
      groups.get(step.layer_name)!.push(step);
    }
    return Array.from(groups.entries());
  }, [steps]);

  const StepIcon = ({ step }: { step: ConstructionStep }) => {
    if (step.requires_tie && step.requires_grout) return <Link className="w-4 h-4 text-stoneblue-600" />;
    if (step.requires_tie) return <Link className="w-4 h-4 text-stoneblue-600" />;
    if (step.requires_grout) return <Droplets className="w-4 h-4 text-ochre-600" />;
    return <Mountain className="w-4 h-4 text-pine-600" />;
  };

  const WarningIcon = ({ level }: { level: WarningItem['level'] }) => {
    if (level === 'danger') return <XCircle className="w-4 h-4 text-cinnabar-600" />;
    return <AlertTriangle className="w-4 h-4 text-ochre-600" />;
  };

  const exportSequence = () => {
    const lines: string[] = [];
    lines.push('=== 古典园林叠石假山施工堆叠图 ===');
    lines.push(`方案名称：${scheme.name}`);
    lines.push(`编制日期：${new Date().toLocaleDateString('zh-CN')}`);
    lines.push(`基底尺寸：${scheme.base_length_cm}cm × ${scheme.base_width_cm}cm`);
    lines.push(`堆叠高度：${(maxH / 100).toFixed(2)}m`);
    lines.push(`石方总数：${placed.length} 方`);
    lines.push(`总重量：${(totalWeight / 1000).toFixed(2)} 吨`);
    lines.push('');
    lines.push('--- 施工步骤 ---');
    for (const step of steps) {
      lines.push(`第${step.order}步 [${step.layer_name}] ${step.stone_name} (${step.stone_code})`);
      lines.push(`  重量：${step.weight_kg}kg | 累计：${step.cumulative_weight_kg}kg`);
      lines.push(`  支撑方式：${step.support_type} | 操作要点：${step.operation}`);
      if (step.requires_tie) lines.push('  ⚙️ 需设置拉结铁件');
      if (step.requires_grout) lines.push('  💧 需灌注M30水泥砂浆');
      if (step.notes) lines.push(`  📍 ${step.notes}`);
      lines.push('');
    }
    lines.push('--- 施工前必读警告 ---');
    warnings.forEach((w, i) => {
      lines.push(`${i + 1}. [${w.category}] ${w.title}`);
      lines.push(`   ${w.description}`);
      lines.push(`   建议：${w.suggestion}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scheme.name}-施工堆叠图.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="施工堆叠"
        subtitle={`${scheme.name} · 共 ${steps.length} 步就位工序 · 总重 ${(totalWeight / 1000).toFixed(2)} 吨 · 高 ${(maxH / 100).toFixed(1)}m · 进度 ${progress.percent}%`}
        actions={
          <>
            <div className="flex items-center gap-2 bg-ink-100 rounded-lg p-1 px-2">
              <div className="flex items-center gap-1.5 text-xs text-ink-600 mr-2">
                <span className="w-2 h-2 rounded-full bg-pine-500"></span>
                {progress.done} 完成
                <span className="w-2 h-2 rounded-full bg-ink-300"></span>
                {progress.pending} 待办
                {progress.rejected > 0 && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cinnabar-500"></span>
                    {progress.rejected} 复核不通过
                  </>
                )}
              </div>
              <div className="w-32 h-2 bg-ink-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pine-500 to-stoneblue-500 transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'timeline' ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              >
                <ListOrdered className="w-4 h-4 inline mr-1" />时间线
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'list' ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              >
                <FileText className="w-4 h-4 inline mr-1" />清单
              </button>
            </div>
            <ActionButton icon={Printer} variant="ghost">打印</ActionButton>
            <ActionButton icon={Download} variant="secondary" onClick={exportSequence}>导出施工图</ActionButton>
            <ActionButton icon={Hammer} onClick={() => setShowBriefing(true)}>施工交底</ActionButton>
          </>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-12 gap-6">
          {/* 左列：堆叠示意图 + 信息汇总 */}
          <div className="col-span-5 space-y-6">
            {/* 堆叠剖面图 */}
            <div className="scroll-card">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <Eye className="w-5 h-5 text-stoneblue-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">堆叠示意图</h3>
                <span className="ml-auto text-xs text-ink-500">单位: cm</span>
              </div>
              <div className="p-5">
                <svg viewBox="0 0 500 380" className="w-full bg-gradient-to-b from-ink-50 to-white rounded-xl border border-ink-100">
                  <defs>
                    <pattern id="grid_c" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d6d3d1" strokeWidth="0.5" />
                    </pattern>
                    <linearGradient id="baseGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#a0522d" />
                      <stop offset="100%" stopColor="#7c4a1e" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="500" height="380" fill="url(#grid_c)" />

                  <rect x="20" y="340" width="460" height="25" rx="3" fill="url(#baseGrad)" opacity="0.8" />
                  <text x="250" y="372" textAnchor="middle" fontSize="11" fill="#57534e" fontFamily="serif">
                    基础座 {scheme.base_length_cm}×{scheme.base_width_cm}cm
                  </text>

                  {placed.map((ps, i) => {
                    const st = stoneMap.get(ps.stone_id);
                    if (!st) return null;
                    const scale = 460 / Math.max(600, scheme.base_length_cm);
                    const x = 20 + ps.pos_x * scale;
                    const w = Math.max(18, st.length_cm * scale);
                    const hScale = 290 / Math.max(400, maxH);
                    const yBot = 340 - ps.pos_z * hScale;
                    const h = Math.max(12, st.height_cm * hScale);
                    const y = yBot - h;
                    const colors: Record<string, string> = {
                      TAIHU: '#b8a082', YING: '#5c6b7a', HUANG: '#b8860b', LINGBI: '#3d3d4a',
                    };
                    const isSel = expandedStep !== null && steps[expandedStep - 1]?.placed_stone_id === ps.id;
                    return (
                      <g key={ps.id} opacity={isSel ? 1 : 0.92}>
                        <rect
                          x={x} y={y} width={w} height={h} rx="6"
                          fill={colors[st.material] ?? '#888'}
                          stroke={isSel ? '#c2410c' : '#44403c'}
                          strokeWidth={isSel ? 2.5 : 1}
                        />
                        <path
                          d={`M${x + 3},${y + h * 0.3} Q${x + w * 0.2},${y + h * 0.1} ${x + w * 0.4},${y + h * 0.25} T${x + w - 5},${y + h * 0.4}`}
                          fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1"
                        />
                        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                          {i + 1}
                        </text>
                        <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#44403c">
                          {st.name.slice(0, 4)}
                        </text>
                      </g>
                    );
                  })}

                  <g>
                    {[0, 1, 2, 3, 4].map(i => {
                      const hScale = 290 / Math.max(400, maxH);
                      const hVal = Math.round(i * 100 / hScale);
                      return (
                        <g key={i}>
                          <line x1="15" y1={340 - i * 100} x2="20" y2={340 - i * 100} stroke="#78716c" strokeWidth="1" />
                          <text x="12" y={343 - i * 100} textAnchor="end" fontSize="9" fill="#78716c">{hVal}</text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </div>

            {/* 汇总信息 */}
            <div className="scroll-card">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <Package className="w-5 h-5 text-ochre-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">工程汇总</h3>
              </div>
              <div className="p-5 grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gradient-to-br from-stoneblue-50 to-white rounded-xl border border-stoneblue-100">
                  <Package className="w-6 h-6 mx-auto text-stoneblue-600 mb-1" />
                  <p className="text-2xl font-bold font-song text-ink-800">{placed.length}</p>
                  <p className="text-xs text-ink-500">方·石</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-ochre-50 to-white rounded-xl border border-ochre-100">
                  <Ruler className="w-6 h-6 mx-auto text-ochre-600 mb-1" />
                  <p className="text-2xl font-bold font-song text-ink-800">{(totalWeight / 1000).toFixed(1)}</p>
                  <p className="text-xs text-ink-500">吨·总重</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-pine-50 to-white rounded-xl border border-pine-100">
                  <Mountain className="w-6 h-6 mx-auto text-pine-600 mb-1" />
                  <p className="text-2xl font-bold font-song text-ink-800">{(maxH / 100).toFixed(1)}</p>
                  <p className="text-xs text-ink-500">米·高度</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="p-4 border border-ink-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-ink-700">审美与谐调度</p>
                    <SealStamp status={aesthetic.overall >= 80 ? 'pass' : aesthetic.overall >= 60 ? 'warn' : 'danger'} size="sm" text={aesthetic.grade} />
                  </div>
                  <RadarChart
                    dimensions={[
                      { key: 'thin', label: '瘦', value: aesthetic.thin },
                      { key: 'wrinkle', label: '皱', value: aesthetic.wrinkle },
                      { key: 'leak', label: '漏', value: aesthetic.leak },
                      { key: 'through', label: '透', value: aesthetic.through },
                      { key: 'harmony', label: '谐', value: aesthetic.harmony },
                    ]}
                    size={180}
                    max={100}
                  />
                </div>
              </div>
            </div>

            {/* 施工前警告清单 */}
            <div className="scroll-card">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <AlertTriangle className="w-5 h-5 text-cinnabar-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">施工前警告清单</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-cinnabar-100 text-cinnabar-700 font-bold">
                  {warnings.length} 项
                </span>
              </div>
              <div className="p-5 space-y-3">
                {warnings.length === 0 ? (
                  <div className="text-center py-6 text-pine-600">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-semibold">未检测到重大隐患，可开始施工</p>
                  </div>
                ) : (
                  warnings.map((w) => (
                    <div key={w.id} className={`p-3 rounded-xl border-l-4 ${w.level === 'danger' ? 'border-l-cinnabar-500 bg-cinnabar-50/60' : 'border-l-ochre-500 bg-ochre-50/60'}`}>
                      <div className="flex items-start gap-2">
                        <WarningIcon level={w.level} />
                        <div>
                          <p className="text-sm font-bold text-ink-800">{w.title}</p>
                          <p className="text-xs text-ink-600 mt-1 leading-relaxed">{w.description}</p>
                          <p className="text-xs mt-2 p-2 bg-white/70 rounded-lg border border-ink-100 text-pine-700">
                            <span className="font-semibold">💡 </span>{w.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右列：施工时间线 */}
          <div className="col-span-7">
            <div className="scroll-card">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                <ListOrdered className="w-5 h-5 text-pine-600" />
                <h3 className="font-bold font-song text-lg text-ink-800">就位顺序与施工步骤</h3>
                <span className="ml-auto text-xs text-ink-500">共 {steps.length} 步</span>
              </div>

              <div className="p-5">
                {viewMode === 'timeline' ? (
                  <div className="relative">
                    <div className="absolute left-[27px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-pine-400 via-stoneblue-400 to-ochre-400" />

                    {layerGroups.map(([layerName, layerSteps], gi) => (
                      <div key={layerName} className="mb-6">
                        <div className="flex items-center gap-2 mb-3 ml-16">
                          <span className="px-3 py-1 bg-gradient-to-r from-ink-700 to-ink-800 text-white rounded-full text-xs font-bold shadow-md">
                            {layerName}
                          </span>
                          <span className="text-xs text-ink-500">{layerSteps.length} 块石</span>
                        </div>

                        <div className="space-y-4">
                          {layerSteps.map((step, si) => {
                            const isExpanded = expandedStep === step.order;
                            const stone = stones.find(s => s.code === step.stone_code);
                            const placedStone = placed.find(p => p.id === step.placed_stone_id);
                            const record = placedStone ? constructionStore.records.find(r => r.placed_stone_id === placedStone.id) : undefined;
                            const orderColors = ['from-pine-500 to-pine-600', 'from-stoneblue-500 to-stoneblue-600', 'from-ochre-500 to-ochre-600', 'from-cinnabar-500 to-cinnabar-600'];
                            const statusColor: Record<string, string> = {
                              pending: 'border-ink-300 bg-white text-ink-500',
                              confirmed: 'border-pine-500 bg-pine-500 text-white',
                              rejected: 'border-cinnabar-500 bg-cinnabar-500 text-white',
                              revision: 'border-ochre-500 bg-ochre-500 text-white',
                            };
                            const stepStatus = record?.actual.status ?? 'pending';
                            return (
                              <div key={`${gi}-${si}`} className="relative pl-16">
                                <div className={`absolute left-[10px] top-1 w-8 h-8 rounded-full bg-gradient-to-br ${orderColors[gi % orderColors.length]} flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-white z-10`}>
                                  {step.order}
                                </div>
                                {record && (
                                  <div className={`absolute left-[44px] top-4 w-5 h-5 rounded-full border-2 ${statusColor[stepStatus]} flex items-center justify-center z-20`}>
                                    {stepStatus === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                                    {stepStatus === 'rejected' && <XCircle className="w-3 h-3" />}
                                    {stepStatus === 'revision' && <RotateCcw className="w-3 h-3" />}
                                    {stepStatus === 'pending' && <Clock className="w-3 h-3" />}
                                  </div>
                                )}

                                <div
                                  onClick={() => setExpandedStep(isExpanded ? null : step.order)}
                                  className={`cursor-pointer rounded-xl border-2 transition-all ${
                                    isExpanded ? 'border-stoneblue-400 bg-stoneblue-50/50 shadow-md' :
                                    stepStatus === 'confirmed' ? 'border-pine-200 bg-pine-50/30 hover:border-pine-300' :
                                    stepStatus === 'rejected' ? 'border-cinnabar-200 bg-cinnabar-50/30 hover:border-cinnabar-300' :
                                    'border-ink-200 bg-white hover:border-stoneblue-300 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="p-4 flex items-center gap-4">
                                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center shadow-inner">
                                      <StepIcon step={step} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-ink-900 font-song text-lg">{step.stone_name}</h4>
                                        <span className="text-xs px-2 py-0.5 rounded bg-ink-100 text-ink-600 font-mono">{step.stone_code}</span>
                                        {step.requires_tie && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-stoneblue-100 text-stoneblue-700 font-bold">⚙️拉结</span>
                                        )}
                                        {step.requires_grout && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-ochre-100 text-ochre-700 font-bold">💧灌浆</span>
                                        )}
                                      </div>
                                      <p className="text-sm text-ink-600 flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Hammer className="w-3.5 h-3.5" />{step.support_type}</span>
                                        <span>·</span>
                                        <span>{stone ? MATERIAL_NAMES[stone.material] : ''}</span>
                                        <span>·</span>
                                        <span>{step.weight_kg} kg</span>
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-ink-500">累计重量</p>
                                      <p className="font-bold text-ink-800 font-song">{(step.cumulative_weight_kg / 1000).toFixed(2)}吨</p>
                                    </div>
                                    <div className="text-ink-400">
                                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 border-t border-ink-100 mt-2 ml-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gradient-to-br from-pine-50 to-white rounded-lg border border-pine-100">
                                          <p className="text-xs text-pine-600 font-bold mb-1">🔨 操作要点</p>
                                          <p className="text-sm text-ink-700 leading-relaxed">{step.operation}</p>
                                        </div>
                                        <div className="p-3 bg-gradient-to-br from-stoneblue-50 to-white rounded-lg border border-stoneblue-100">
                                          <p className="text-xs text-stoneblue-600 font-bold mb-1">📍 位置参考</p>
                                          <p className="text-sm text-ink-700">{step.notes}</p>
                                        </div>
                                        {stone && (
                                          <div className="col-span-2 p-3 bg-gradient-to-br from-ochre-50 to-white rounded-lg border border-ochre-100">
                                            <p className="text-xs text-ochre-600 font-bold mb-1">📝 石品档案</p>
                                            <div className="grid grid-cols-4 gap-3 text-sm">
                                              <div><span className="text-ink-500">三围</span><p className="font-semibold">{stone.length_cm}×{stone.width_cm}×{stone.height_cm}cm</p></div>
                                              <div><span className="text-ink-500">瘦</span><p className="font-semibold">{stone.thinness}/10</p></div>
                                              <div><span className="text-ink-500">皱</span><p className="font-semibold">{stone.wrinkle}/10</p></div>
                                              <div><span className="text-ink-500">纹理</span><p className="font-semibold">{stone.texture_dir}</p></div>
                                            </div>
                                            {stone.notes && <p className="text-xs text-ink-600 mt-2 italic">"{stone.notes}"</p>}
                                          </div>
                                        )}
                                        {record && record.actual.status !== 'pending' && (
                                          <div className="col-span-2 p-3 bg-gradient-to-br from-ink-50 to-white rounded-lg border border-ink-200">
                                            <div className="flex items-center justify-between mb-2">
                                              <p className="text-xs text-ink-700 font-bold">📋 现场施工记录</p>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                record.actual.status === 'confirmed' ? 'bg-pine-100 text-pine-700' :
                                                record.actual.status === 'rejected' ? 'bg-cinnabar-100 text-cinnabar-700' :
                                                'bg-ochre-100 text-ochre-700'
                                              }`}>
                                                {record.actual.status === 'confirmed' ? '✓ 已复核确认' :
                                                 record.actual.status === 'rejected' ? '✗ 复核不通过' :
                                                 '⟲ 待返工'}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                              <div>
                                                <span className="text-ink-500">吊装完成时间</span>
                                                <p className="font-semibold text-ink-800">
                                                  {record.actual.confirmed_at
                                                    ? new Date(record.actual.confirmed_at).toLocaleString('zh-CN')
                                                    : '—'}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-ink-500">吊装负责人</span>
                                                <p className="font-semibold text-ink-800">{record.actual.operator ?? '—'}</p>
                                              </div>
                                              <div>
                                                <span className="text-ink-500">吊装用时</span>
                                                <p className="font-semibold text-ink-800">
                                                  {record.actual.lift_duration_min != null ? `${record.actual.lift_duration_min} 分钟` : '—'}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-ink-500">复核人</span>
                                                <p className="font-semibold text-ink-800">{record.actual.reviewer ?? '—'}</p>
                                              </div>
                                              {record.actual.review_result && (
                                                <div className="col-span-2">
                                                  <span className="text-ink-500">复核结论</span>
                                                  <p className="font-semibold text-ink-800">{record.actual.review_result}</p>
                                                </div>
                                              )}
                                              {record.actual.notes && (
                                                <div className="col-span-2">
                                                  <span className="text-ink-500">现场备注</span>
                                                  <p className="text-ink-700 bg-white/70 rounded border border-ink-100 px-2 py-1 mt-0.5">
                                                    {record.actual.notes}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {steps.length === 0 && (
                      <div className="text-center py-16 text-ink-500 ml-14">
                        <ListOrdered className="w-14 h-14 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">暂无施工步骤</p>
                        <p className="text-sm mt-1">请先到「重心校核」页面布置堆叠方案</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-ink-300">
                          <th className="py-3 px-3 text-left font-bold text-ink-700 bg-ink-50 w-16">序号</th>
                          <th className="py-3 px-3 text-left font-bold text-ink-700 bg-ink-50">石名/编号</th>
                          <th className="py-3 px-3 text-left font-bold text-ink-700 bg-ink-50">所属层</th>
                          <th className="py-3 px-3 text-center font-bold text-ink-700 bg-ink-50">方式</th>
                          <th className="py-3 px-3 text-center font-bold text-ink-700 bg-ink-50">单重</th>
                          <th className="py-3 px-3 text-center font-bold text-ink-700 bg-ink-50">累计</th>
                          <th className="py-3 px-3 text-center font-bold text-ink-700 bg-ink-50">拉结</th>
                          <th className="py-3 px-3 text-center font-bold text-ink-700 bg-ink-50">灌浆</th>
                        </tr>
                      </thead>
                      <tbody>
                        {steps.map((s, i) => (
                          <tr key={s.order} className={`border-b border-ink-100 hover:bg-ink-50 ${i % 2 === 1 ? 'bg-ink-50/30' : ''}`}>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ink-800 text-white font-bold text-xs">
                                {s.order}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-ink-800">{s.stone_name}</p>
                              <p className="text-xs text-ink-500 font-mono">{s.stone_code}</p>
                            </td>
                            <td className="py-3 px-3 text-ink-600">{s.layer_name}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-1 rounded bg-stoneblue-100 text-stoneblue-700 font-bold text-xs">{s.support_type}</span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono">{s.weight_kg}kg</td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-ink-700">{(s.cumulative_weight_kg / 1000).toFixed(2)}t</td>
                            <td className="py-3 px-3 text-center">
                              {s.requires_tie ? <Link className="w-4 h-4 mx-auto text-stoneblue-600" /> : <span className="text-ink-300">—</span>}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {s.requires_grout ? <Droplets className="w-4 h-4 mx-auto text-ochre-600" /> : <span className="text-ink-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConstructionBriefingModal
        open={showBriefing}
        onClose={() => setShowBriefing(false)}
        projectId={currentPrj.id}
        schemeId={scheme.id}
        steps={steps}
        placedStones={placed}
        stoneMap={stoneMap}
      />
    </div>
  );
}
