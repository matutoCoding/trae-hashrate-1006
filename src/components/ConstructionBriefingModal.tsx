import { useMemo, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Ruler,
  Hammer,
  Mountain,
  FileText,
  Play,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useConstructionStore } from '@/store/constructionStore';
import type { ConstructionStep } from '@/types/calc';
import type { PlacedStone, Stone } from '@/types/stone';
import { MATERIAL_NAMES } from '@/types/stone';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  schemeId: string;
  steps: ConstructionStep[];
  placedStones: PlacedStone[];
  stoneMap: Map<string, Stone>;
}

export default function ConstructionBriefingModal({
  open,
  onClose,
  projectId,
  schemeId,
  steps,
  placedStones,
  stoneMap,
}: Props) {
  const store = useConstructionStore();
  const [cursor, setCursor] = useState(0);
  const [operator, setOperator] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [liftMin, setLiftMin] = useState<string>('');
  const [reviewResult, setReviewResult] = useState('');
  const [notes, setNotes] = useState('');

  const currentStep = steps[cursor];
  const placedStone = currentStep ? placedStones.find(p => p.id === currentStep.placed_stone_id) : undefined;
  const stone = placedStone ? stoneMap.get(placedStone.stone_id) : undefined;
  const record = placedStone
    ? store.records.find(r => r.placed_stone_id === placedStone.id)
    : undefined;

  const prev = () => setCursor(Math.max(0, cursor - 1));
  const next = () => setCursor(Math.min(steps.length - 1, cursor + 1));
  const jump = (idx: number) => setCursor(idx);

  const resetForm = () => {
    if (record) {
      setOperator(record.actual.operator ?? '');
      setReviewer(record.actual.reviewer ?? '');
      setLiftMin(record.actual.lift_duration_min != null ? String(record.actual.lift_duration_min) : '');
      setReviewResult(record.actual.review_result ?? '');
      setNotes(record.actual.notes ?? '');
    } else {
      setOperator('');
      setReviewer('');
      setLiftMin('');
      setReviewResult('');
      setNotes('');
    }
  };

  useMemo(resetForm, [cursor, record?.id]);

  const confirm = (status: 'confirmed' | 'rejected' | 'revision') => {
    if (!placedStone) return;
    store[status === 'confirmed' ? 'confirmStep' : status === 'rejected' ? 'rejectStep' : 'markRevisionStep'](
      projectId,
      schemeId,
      placedStone.id,
      {
        operator: operator.trim() || undefined,
        reviewer: reviewer.trim() || undefined,
        lift_duration_min: liftMin.trim() ? Number(liftMin) : undefined,
        review_result: reviewResult.trim() || undefined,
        notes: notes.trim() || undefined,
      }
    );
    if (cursor < steps.length - 1) {
      setTimeout(() => setCursor(cursor + 1), 200);
    }
  };

  const backToPending = () => {
    if (!placedStone) return;
    store.resetStep(projectId, schemeId, placedStone.id);
  };

  if (!open || steps.length === 0) return null;

  const progress = store.getProgress(projectId, schemeId);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-[960px] max-w-full h-[88vh] bg-ink-50 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-ink-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between bg-gradient-to-r from-pine-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pine-600 flex items-center justify-center">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-song text-lg font-bold text-ink-900">施工交底 · 逐块就位确认</h3>
              <p className="text-xs text-ink-500 mt-0.5">
                进度 {progress.done}/{progress.total}（{progress.percent}%）· {progress.rejected > 0 && `${progress.rejected}项复核不通过`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 进度条 */}
        <div className="px-6 py-3 bg-white border-b border-ink-200">
          <div className="h-2 bg-ink-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pine-500 via-stoneblue-500 to-ochre-500 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
            {steps.map((s, i) => {
              const ps = placedStones.find(p => p.id === s.placed_stone_id);
              const rec = ps ? store.records.find(r => r.placed_stone_id === ps.id) : undefined;
              const st = rec?.actual.status ?? 'pending';
              const colors: Record<string, string> = {
                pending: 'bg-ink-200 text-ink-600 hover:bg-ink-300',
                confirmed: 'bg-pine-500 text-white hover:bg-pine-600',
                rejected: 'bg-cinnabar-500 text-white hover:bg-cinnabar-600',
                revision: 'bg-ochre-500 text-white hover:bg-ochre-600',
              };
              return (
                <button
                  key={s.placed_stone_id}
                  onClick={() => jump(i)}
                  className={`relative w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
                    i === cursor ? 'ring-4 ring-stoneblue-200 ' + colors[st] : colors[st]
                  }`}
                  title={`第${s.order}步 · ${s.stone_name}`}
                >
                  {s.order}
                  {st === 'confirmed' && (
                    <CheckCircle2 className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 text-white bg-pine-600 rounded-full" />
                  )}
                  {st === 'rejected' && (
                    <XCircle className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 text-white bg-cinnabar-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左列：步骤资料 */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-ink-500">第 {currentStep.order} / {steps.length} 步 · {currentStep.layer_name}</p>
                <h2 className="font-song text-2xl font-bold text-ink-900 mt-1">{currentStep.stone_name}</h2>
                <p className="text-xs font-mono text-ink-500 mt-0.5">{currentStep.stone_code}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                currentStep.support_type === '挑' ? 'bg-cinnabar-100 text-cinnabar-700' :
                currentStep.support_type === '竖' ? 'bg-stoneblue-100 text-stoneblue-700' :
                currentStep.support_type === '叠' ? 'bg-pine-100 text-pine-700' :
                'bg-ochre-100 text-ochre-700'
              }`}>
                {currentStep.support_type}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-pine-50 to-white border border-pine-100">
                <p className="text-xs text-pine-600 font-bold">🔨 操作要点</p>
                <p className="text-sm text-ink-700 mt-2 leading-relaxed">{currentStep.operation}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-stoneblue-50 to-white border border-stoneblue-100">
                <p className="text-xs text-stoneblue-600 font-bold">📍 位置参考</p>
                <p className="text-sm text-ink-700 mt-2">{currentStep.notes ?? '按图施工'}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-ochre-50 to-white border border-ochre-100">
                <p className="text-xs text-ochre-600 font-bold">⚖️ 重量 / 累计</p>
                <p className="text-sm text-ink-700 mt-2">单重 <b>{currentStep.weight_kg}</b> kg</p>
                <p className="text-sm text-ink-700 mt-1">累计 <b>{(currentStep.cumulative_weight_kg / 1000).toFixed(2)}</b> 吨</p>
              </div>
            </div>

            {stone && (
              <div className="p-4 rounded-xl bg-white border border-ink-200">
                <div className="flex items-center gap-2 mb-3">
                  <Mountain className="w-4 h-4 text-ochre-600" />
                  <p className="text-sm font-bold text-ink-800">石品档案</p>
                </div>
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-ink-500">材质</p>
                    <p className="font-semibold text-ink-800">{MATERIAL_NAMES[stone.material]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">三围(长×宽×高)</p>
                    <p className="font-semibold text-ink-800">{stone.length_cm}×{stone.width_cm}×{stone.height_cm} cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">瘦</p>
                    <p className="font-semibold text-ink-800">{stone.thinness}/10</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">皱</p>
                    <p className="font-semibold text-ink-800">{stone.wrinkle}/10</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">纹理方向</p>
                    <p className="font-semibold text-ink-800">{stone.texture_dir}</p>
                  </div>
                </div>
                {(currentStep.requires_tie || currentStep.requires_grout) && (
                  <div className="mt-3 p-3 rounded-lg bg-ink-50 border border-ink-200 flex items-center gap-4 text-sm">
                    {currentStep.requires_tie && (
                      <div className="flex items-center gap-1.5 text-stoneblue-700 font-semibold">
                        <FileText className="w-4 h-4" /> 需设置拉结铁件
                      </div>
                    )}
                    {currentStep.requires_grout && (
                      <div className="flex items-center gap-1.5 text-ochre-700 font-semibold">
                        💧 需灌注 M30 水泥砂浆
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-stoneblue-50 to-white border border-stoneblue-100">
                <p className="text-xs text-stoneblue-600 font-bold">坐标 (X,Y,Z)</p>
                <p className="text-sm text-ink-800 mt-2 font-mono">
                  {placedStone?.pos_x ?? '--'}，{placedStone?.pos_y ?? '--'}，{placedStone?.pos_z ?? '--'} cm
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-pine-50 to-white border border-pine-100">
                <p className="text-xs text-pine-600 font-bold">支撑关系</p>
                <p className="text-sm text-ink-800 mt-2">
                  {placedStone?.supported_by.length
                    ? `由 ${placedStone.supported_by.length} 块石承托`
                    : '置于基座层'}
                </p>
              </div>
            </div>
          </div>

          {/* 右列：交底确认表单 */}
          <div className="w-[380px] border-l border-ink-200 bg-white p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-song font-bold text-ink-800">现场确认</h4>
              {record && record.actual.status !== 'pending' && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  record.actual.status === 'confirmed' ? 'bg-pine-100 text-pine-700' :
                  record.actual.status === 'rejected' ? 'bg-cinnabar-100 text-cinnabar-700' :
                  'bg-ochre-100 text-ochre-700'
                }`}>
                  {record.actual.status === 'confirmed' ? '已确认' :
                   record.actual.status === 'rejected' ? '复核不通过' : '待返工'}
                </span>
              )}
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="flex items-center gap-1.5 text-xs text-ink-600 mb-1 font-semibold">
                  <User className="w-3.5 h-3.5" /> 吊装负责人
                </label>
                <input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="现场班组长姓名"
                  className="w-full px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-ink-600 mb-1 font-semibold">
                  <User className="w-3.5 h-3.5" /> 复核人
                </label>
                <input
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="现场工程师/监理"
                  className="w-full px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-ink-600 mb-1 font-semibold">
                  <Clock className="w-3.5 h-3.5" /> 吊装用时（分钟）
                </label>
                <input
                  type="number"
                  value={liftMin}
                  onChange={(e) => setLiftMin(e.target.value)}
                  placeholder="如 45"
                  className="w-full px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-ink-600 mb-1 font-semibold">
                  <Ruler className="w-3.5 h-3.5" /> 复核结果
                </label>
                <select
                  value={reviewResult}
                  onChange={(e) => setReviewResult(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
                >
                  <option value="">选择结论...</option>
                  <option>位姿正确，接触吻合</option>
                  <option>位姿合格，缝隙达标</option>
                  <option>需微调位置</option>
                  <option>支撑面接触不良需垫铁片</option>
                  <option>拉结铁件位置需调整</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-ink-600 mb-1 font-semibold">
                  <FileText className="w-3.5 h-3.5" /> 现场备注
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="施工过程中的特殊说明、异常记录..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500 resize-none"
                />
              </div>

              {record?.actual.confirmed_at && (
                <div className="mt-2 p-3 rounded-lg bg-ink-50 border border-ink-200">
                  <p className="text-xs text-ink-500">最后更新</p>
                  <p className="text-sm text-ink-700 mt-0.5 font-mono">
                    {new Date(record.actual.confirmed_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
            </div>

            {/* 底部操作按钮 */}
            <div className="pt-4 border-t border-ink-200 mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={prev}
                  disabled={cursor === 0}
                  className="ghost-btn text-sm py-2 flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> 上一步
                </button>
                <button
                  onClick={next}
                  disabled={cursor === steps.length - 1}
                  className="ghost-btn text-sm py-2 flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  下一步 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => confirm('rejected')}
                  className="px-3 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-br from-cinnabar-500 to-cinnabar-600 hover:from-cinnabar-600 hover:to-cinnabar-700 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> 复核不通过
                </button>
                <button
                  onClick={() => confirm('confirmed')}
                  className="px-3 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-br from-pine-500 to-pine-600 hover:from-pine-600 hover:to-pine-700 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> 确认就位
                </button>
              </div>
              {record && record.actual.status !== 'pending' && (
                <button
                  onClick={backToPending}
                  className="w-full ghost-btn text-sm py-2 flex items-center justify-center gap-1.5 text-ink-500"
                >
                  <RotateCcw className="w-4 h-4" /> 重置为待处理
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
