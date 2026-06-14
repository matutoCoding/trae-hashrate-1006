import { useMemo, useState } from 'react';
import { FileText, Download, X, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useReportStore, buildVerificationReport, exportReportAsText } from '@/store/reportStore';
import type {
  CenterOfGravityResult,
  OverhangMomentResult,
  ContactStressResult,
  TieAndGroutResult,
  LoadCaseResult,
  WarningItem,
} from '@/types/calc';
import type { PlacedStone, Stone } from '@/types/stone';

interface ReportPanelProps {
  open: boolean;
  onClose: () => void;
  schemeId: string;
  projectId: string;
  cgResult: CenterOfGravityResult;
  overhangs: OverhangMomentResult[];
  contactStresses: ContactStressResult[];
  tieGrout: TieAndGroutResult;
  loadCases: LoadCaseResult[];
  warnings: WarningItem[];
  placedStones: (PlacedStone & { stone?: Stone })[];
}

export default function ReportPanel({
  open, onClose, schemeId, projectId,
  cgResult, overhangs, contactStresses, tieGrout, loadCases, warnings, placedStones,
}: ReportPanelProps) {
  const projectStore = useProjectStore();
  const reportStore = useReportStore();
  const [reportName, setReportName] = useState('结构校核报告-' + new Date().toLocaleDateString('zh-CN'));
  const [operator, setOperator] = useState('现场工程师');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const history = useMemo(
    () => reportStore.getReportsForProject(projectId),
    [reportStore.reports, projectId]
  );

  const currentProject = projectStore.getCurrentProject();

  const doGenerate = () => {
    const placedMeta = placedStones.map(p => ({
      id: p.id,
      name: p.stone?.name ?? '未命名',
      code: p.stone?.code ?? '??',
    }));
    const input = {
      projectId,
      schemeId,
      reportName: reportName.trim() || '未命名报告',
      operator: operator.trim() || undefined,
      cgResult,
      overhangs,
      contactStresses,
      tieGrout,
      loadCases,
      warnings,
      placedStones: placedMeta,
    };
    const built = buildVerificationReport(input);
    reportStore.addReport(built);
  };

  const selected = history.find(r => r.id === selectedReport);

  const downloadReport = (rid: string) => {
    const r = reportStore.reports.find(x => x.id === rid);
    if (!r) return;
    const txt = exportReportAsText(r);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.name}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-[920px] max-w-full h-[85vh] bg-ink-50 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-ink-200">
        <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between bg-gradient-to-r from-stoneblue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stoneblue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-song text-lg font-bold text-ink-900">结构校核报告</h3>
              <p className="text-xs text-ink-500 mt-0.5">
                方案：{currentProject?.name ?? '未命名'} · 共 {history.length} 份历史报告
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：历史报告列表 */}
          <aside className="w-72 border-r border-ink-200 bg-white flex flex-col">
            <div className="p-4 border-b border-ink-200">
              <p className="font-song font-semibold text-ink-800 text-sm mb-2">生成新报告</p>
              <input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="报告名称"
                className="w-full px-3 py-1.5 mb-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
              />
              <input
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="校核人员"
                className="w-full px-3 py-1.5 mb-3 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
              />
              <button
                onClick={doGenerate}
                disabled={placedStones.length === 0}
                className="stoneblue-btn w-full text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                生成校核报告
              </button>
            </div>
            <div className="p-3 border-b border-ink-200">
              <p className="font-song font-semibold text-ink-800 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-ink-500" />
                历史报告
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {history.length === 0 && (
                <div className="p-6 text-center text-ink-400 text-xs">暂无历史报告</div>
              )}
              {history.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r.id)}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    selectedReport === r.id
                      ? 'bg-stoneblue-50 border-stoneblue-400'
                      : 'bg-white hover:bg-ink-50 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-song text-sm font-medium text-ink-800 truncate flex-1">{r.name}</p>
                    <span
                      className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                        r.overall_verdict === '合格'
                          ? 'bg-pine-100 text-pine-700'
                          : r.overall_verdict === '基本合格'
                          ? 'bg-ochre-100 text-ochre-700'
                          : 'bg-cinnabar-100 text-cinnabar-700'
                      }`}
                    >
                      {r.overall_verdict}
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-500 mt-1">
                    {new Date(r.generated_at).toLocaleString('zh-CN')}
                  </p>
                  <p className="text-[10px] text-ink-400 mt-0.5">
                    {r.operator ?? '未记录校核人'} · {r.overall_score}/100
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadReport(r.id); }}
                      className="ghost-btn text-[10px] py-0.5 px-2"
                    >
                      <Download className="w-3 h-3" /> 下载
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); reportStore.removeReport(r.id); }}
                      className="ghost-btn text-[10px] py-0.5 px-2 text-cinnabar-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* 右侧：报告预览 */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-400">
                <FileText className="w-16 h-16 mb-3 opacity-20" />
                <p className="text-sm">选择左侧历史报告预览</p>
                <p className="text-xs mt-1">或点击上方「生成校核报告」</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between bg-white">
                  <div>
                    <p className="font-song font-semibold text-ink-800">{selected.name}</p>
                    <p className="text-xs text-ink-500">
                      {new Date(selected.generated_at).toLocaleString('zh-CN')} · {selected.operator ?? '未记录'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadReport(selected.id)}
                      className="stoneblue-btn text-sm py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> 导出 .txt
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* 总体结论 */}
                  <div className={`p-5 rounded-xl border ${
                    selected.overall_verdict === '合格'
                      ? 'border-pine-300 bg-pine-50/60'
                      : selected.overall_verdict === '基本合格'
                      ? 'border-ochre-300 bg-ochre-50/60'
                      : 'border-cinnabar-300 bg-cinnabar-50/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selected.overall_verdict === '合格' && <CheckCircle2 className="w-8 h-8 text-pine-600" />}
                        {selected.overall_verdict === '基本合格' && <AlertTriangle className="w-8 h-8 text-ochre-600" />}
                        {selected.overall_verdict === '待优化' && <XCircle className="w-8 h-8 text-cinnabar-600" />}
                        <div>
                          <p className="font-song text-xl font-bold text-ink-900">总体评定：{selected.overall_verdict}</p>
                          <p className="text-xs text-ink-600 mt-0.5">综合评分 {selected.overall_score} / 100</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-ink-500">报告编号</p>
                        <p className="text-xs font-mono text-ink-700">{selected.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* 重心 */}
                  <div className="scroll-card">
                    <div className="px-5 py-3 border-b border-ink-200 font-song font-semibold text-ink-800">一、重心校核</div>
                    <div className="p-5 grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">总重量</p>
                        <p className="font-bold text-ink-800 mt-1">{selected.center_of_gravity.total_weight_kg} kg</p>
                      </div>
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">重心坐标 (X,Y,Z)</p>
                        <p className="font-bold text-ink-800 mt-1">{selected.center_of_gravity.cg_x_cm}, {selected.center_of_gravity.cg_y_cm}, {selected.center_of_gravity.cg_z_cm} cm</p>
                      </div>
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">距最近边缘</p>
                        <p className="font-bold text-ink-800 mt-1">{selected.center_of_gravity.distance_to_nearest_edge_cm} cm</p>
                      </div>
                    </div>
                    <div className="px-5 pb-5">
                      <p className="text-xs text-ink-500 mb-2">分层重心分布</p>
                      <div className="bg-white border border-ink-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-ink-100 text-ink-600">
                            <tr>
                              <th className="text-left px-3 py-1.5">层名</th>
                              <th className="text-right px-3 py-1.5">重量(kg)</th>
                              <th className="text-right px-3 py-1.5">X</th>
                              <th className="text-right px-3 py-1.5">Y</th>
                              <th className="text-right px-3 py-1.5">Z</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.center_of_gravity.layer_cgs.map((l, i) => (
                              <tr key={i} className="border-t border-ink-100">
                                <td className="px-3 py-1.5">{l.layer_name}</td>
                                <td className="text-right px-3 py-1.5">{l.weight_kg}</td>
                                <td className="text-right px-3 py-1.5">{l.cg_x}</td>
                                <td className="text-right px-3 py-1.5">{l.cg_y}</td>
                                <td className="text-right px-3 py-1.5">{l.cg_z}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 悬挑 */}
                  <div className="scroll-card">
                    <div className="px-5 py-3 border-b border-ink-200 font-song font-semibold text-ink-800">二、悬挑力矩与配重</div>
                    <div className="p-5 grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">最大悬挑</p>
                        <p className="font-bold text-ink-800 mt-1">{selected.cantilever.max_overhang_cm} cm</p>
                      </div>
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">倾覆力矩</p>
                        <p className="font-bold text-ink-800 mt-1">{selected.cantilever.overturning_moment_nm} N·m</p>
                      </div>
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">安全系数</p>
                        <p className={`font-bold mt-1 ${selected.cantilever.safety_factor >= 1.5 ? 'text-pine-700' : 'text-cinnabar-700'}`}>
                          K = {selected.cantilever.safety_factor}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 接触应力 */}
                  <div className="scroll-card">
                    <div className="px-5 py-3 border-b border-ink-200 font-song font-semibold text-ink-800">三、石与石接触应力</div>
                    <div className="p-5">
                      <div className="bg-white border border-ink-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-ink-100 text-ink-600">
                            <tr>
                              <th className="text-left px-3 py-1.5">石名</th>
                              <th className="text-left px-3 py-1.5">石号</th>
                              <th className="text-right px-3 py-1.5">最大(MPa)</th>
                              <th className="text-right px-3 py-1.5">平均(MPa)</th>
                              <th className="text-right px-3 py-1.5">接触面积(cm²)</th>
                              <th className="text-center px-3 py-1.5">状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.contact_stresses.map((c, i) => (
                              <tr key={i} className="border-t border-ink-100">
                                <td className="px-3 py-1.5">{c.stone_name}</td>
                                <td className="px-3 py-1.5 text-ink-500">{c.stone_code}</td>
                                <td className="text-right px-3 py-1.5">{c.max_stress_mpa}</td>
                                <td className="text-right px-3 py-1.5">{c.avg_stress_mpa}</td>
                                <td className="text-right px-3 py-1.5">{c.contact_area_cm2}</td>
                                <td className="text-center px-3 py-1.5">
                                  {c.status === 'safe' && <span className="text-pine-600">✓</span>}
                                  {c.status === 'warning' && <span className="text-ochre-600">⚠</span>}
                                  {c.status === 'danger' && <span className="text-cinnabar-600">✗</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 拉结灌浆 */}
                  <div className="scroll-card">
                    <div className="px-5 py-3 border-b border-ink-200 font-song font-semibold text-ink-800">四、拉结铁件与灌浆</div>
                    <div className="p-5 grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">拉结安全系数</p>
                        <p className="font-bold text-ink-800 mt-1">{selected.tie_grout.tie_safety_factor}</p>
                      </div>
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">灌浆安全系数</p>
                        <p className="font-bold text-ink-800 mt-1">{selected.tie_grout.grout_safety_factor}</p>
                      </div>
                      <div className="bg-ink-50 p-3 rounded-lg">
                        <p className="text-xs text-ink-500">拉结 / 灌浆 / 石体</p>
                        <p className="font-bold text-ink-800 mt-1">
                          {(selected.tie_grout.load_share_ratio_tie * 100).toFixed(0)}% / {(selected.tie_grout.load_share_ratio_grout * 100).toFixed(0)}% / {(selected.tie_grout.load_share_ratio_stone * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 多工况 */}
                  <div className="scroll-card">
                    <div className="px-5 py-3 border-b border-ink-200 font-song font-semibold text-ink-800">五、多工况倾覆系数</div>
                    <div className="p-5">
                      <div className="bg-white border border-ink-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-ink-100 text-ink-600">
                            <tr>
                              <th className="text-left px-3 py-1.5">工况</th>
                              <th className="text-right px-3 py-1.5">水平力(kN)</th>
                              <th className="text-right px-3 py-1.5">抗力矩(kN·m)</th>
                              <th className="text-right px-3 py-1.5">倾覆矩(kN·m)</th>
                              <th className="text-right px-3 py-1.5">安全系数</th>
                              <th className="text-center px-3 py-1.5">结果</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.load_cases.map((l, i) => (
                              <tr key={i} className="border-t border-ink-100">
                                <td className="px-3 py-1.5">{l.case_name}</td>
                                <td className="text-right px-3 py-1.5">{l.horizontal_force_kn}</td>
                                <td className="text-right px-3 py-1.5">{l.resisting_moment_kNm}</td>
                                <td className="text-right px-3 py-1.5">{l.overturning_moment_kNm}</td>
                                <td className="text-right px-3 py-1.5 font-bold">{l.safety_factor}</td>
                                <td className="text-center px-3 py-1.5">
                                  {l.status === 'pass' && <span className="text-pine-600 font-semibold">✓ 通过</span>}
                                  {l.status === 'marginal' && <span className="text-ochre-600 font-semibold">⚠ 临界</span>}
                                  {l.status === 'fail' && <span className="text-cinnabar-600 font-semibold">✗ 不通过</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 告警 */}
                  <div className="scroll-card">
                    <div className="px-5 py-3 border-b border-ink-200 font-song font-semibold text-ink-800">六、结构隐患告警</div>
                    <div className="p-5 space-y-2">
                      {selected.warnings.length === 0 && (
                        <p className="text-sm text-pine-600 py-4 text-center">✓ 未检测到结构隐患</p>
                      )}
                      {selected.warnings.map((w, i) => (
                        <div key={i} className={`p-3 rounded-lg border-l-4 ${
                          w.level === 'danger' ? 'border-cinnabar-500 bg-cinnabar-50/60' :
                          w.level === 'warning' ? 'border-ochre-500 bg-ochre-50/60' :
                          'border-pine-500 bg-pine-50/60'
                        }`}>
                          <p className="text-sm font-semibold text-ink-900">
                            [{w.level === 'danger' ? '严重' : w.level === 'warning' ? '警告' : '提示'}] {w.title}
                          </p>
                          <p className="text-xs text-ink-600 mt-1">{w.detail}</p>
                          <p className="text-xs text-ink-500 mt-1">💡 建议：{w.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
