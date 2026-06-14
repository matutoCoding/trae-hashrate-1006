import { useState, useMemo, useEffect } from 'react';
import Header, { ActionButton } from '@/components/layout/Header';
import { useStoneStore } from '@/store/stoneStore';
import { useProjectStore } from '@/store/projectStore';
import { MATERIAL_NAMES, type StoneMaterial, type Stone } from '@/types/stone';
import { estimateVolume, estimateWeight } from '@/utils/geometry';
import SealStamp from '@/components/SealStamp';
import { Plus, Edit3, Trash2, Save, X, Weight, Ruler, Layers, Search, Filter, FileJson, FileUp } from 'lucide-react';

interface FormState {
  name: string;
  code: string;
  material: StoneMaterial;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  thinness: number;
  wrinkle: number;
  porosity: number;
  complexity: number;
  edges: number;
  texture_dir: string;
  notes: string;
}

const emptyForm: FormState = {
  name: '', code: '', material: 'TAIHU',
  weight_kg: 0, length_cm: 80, width_cm: 50, height_cm: 60,
  thinness: 6, wrinkle: 6, porosity: 5, complexity: 5, edges: 5,
  texture_dir: '自然纹理', notes: '',
};

const materialColors: Record<string, string> = {
  TAIHU: 'from-stoneblue-400 to-stoneblue-600',
  YING: 'from-ink-400 to-ink-600',
  HUANG: 'from-ochre-400 to-ochre-600',
  LINGBI: 'from-ink-700 to-ink-900',
};

export default function StoneEntry() {
  const stoneStore = useStoneStore();
  const projectStore = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterMat, setFilterMat] = useState<StoneMaterial | 'all'>('all');

  const currentPrj = projectStore.ensureDefaultProject();
  const projectId = currentPrj.id;

  useEffect(() => {
    stoneStore.ensureStonesForProject(projectId);
  }, [projectId]);

  const projectStones = useMemo(
    () => stoneStore.getStonesForProject(projectId),
    [stoneStore.stones, projectId]
  );

  const computed = useMemo(() => {
    const vol = estimateVolume(form.length_cm, form.width_cm, form.height_cm);
    const w = estimateWeight(vol, form.material);
    return { volume: vol, est_weight: w };
  }, [form.length_cm, form.width_cm, form.height_cm, form.material]);

  const filtered = useMemo(() => {
    return projectStones.filter(s => {
      const matchText = !search || s.name.includes(search) || s.code.toLowerCase().includes(search.toLowerCase());
      const matchMat = filterMat === 'all' || s.material === filterMat;
      return matchText && matchMat;
    });
  }, [projectStones, search, filterMat]);

  const totalWeight = filtered.reduce((s, x) => s + x.weight_kg, 0);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      stoneStore.updateStone(editingId, { ...form });
    } else {
      stoneStore.addStone(projectId, { ...form });
    }
    resetForm();
  };

  const handleEdit = (s: Stone) => {
    setForm({
      name: s.name, code: s.code, material: s.material,
      weight_kg: s.weight_kg, length_cm: s.length_cm, width_cm: s.width_cm, height_cm: s.height_cm,
      thinness: s.thinness, wrinkle: s.wrinkle, porosity: s.porosity,
      complexity: s.complexity, edges: s.edges,
      texture_dir: s.texture_dir, notes: s.notes ?? '',
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const Slider = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) => (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="ink-label !mb-0">{label}</label>
        <span className="text-sm font-bold text-stoneblue-600 w-8 text-right">{value.toFixed(1)}</span>
      </div>
      <input
        type="range" min="0" max="10" step="0.1" value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-2 rounded-full appearance-none bg-ink-200 accent-stoneblue-600 cursor-pointer"
      />
      {hint && <p className="text-[10px] text-ink-500 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="叠石录入"
        subtitle={`石库档案 · 现存 ${projectStones.length} 方 · 总重 ${(totalWeight / 1000).toFixed(2)} 吨`}
        actions={
          <>
            <ActionButton icon={FileUp} variant="ghost">批量导入</ActionButton>
            <ActionButton icon={FileJson} variant="ghost">导出JSON</ActionButton>
            <ActionButton icon={Plus} onClick={() => { resetForm(); setShowForm(true); }}>
              新增湖石
            </ActionButton>
          </>
        }
      />

      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-5">
            <div className="scroll-card p-6 sticky top-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="section-title !mb-0">
                  {editingId ? '编辑湖石档案' : '录入新湖石'}
                </h3>
                {showForm && (
                  <button onClick={resetForm} className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!showForm ? (
                <div className="py-16 text-center text-ink-400">
                  <Layers className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-song text-sm">点击「新增湖石」开始录入</p>
                  <p className="text-xs mt-2">或从列表选择编辑现有档案</p>
                </div>
              ) : (
                <div className="space-y-5 ink-fade">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="ink-label">石名 *</label>
                      <input
                        className="ink-input font-song" placeholder="如：云骨峰"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="ink-label">石号</label>
                      <input
                        className="ink-input font-mono text-sm" placeholder="自动生成"
                        value={form.code}
                        onChange={e => setForm({ ...form, code: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="ink-label">材质</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(MATERIAL_NAMES) as StoneMaterial[]).map(m => (
                        <button
                          key={m}
                          onClick={() => setForm({ ...form, material: m })}
                          className={`py-2 px-2 rounded-md text-xs font-medium transition-all border ${
                            form.material === m
                              ? `bg-gradient-to-br ${materialColors[m]} text-white border-transparent shadow-md`
                              : 'bg-white/60 text-ink-700 border-ink-200 hover:border-stoneblue-400'
                          }`}
                        >
                          {MATERIAL_NAMES[m]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-stoneblue-50 to-ochre-50 border border-stoneblue-100/50">
                    <p className="font-song text-sm font-semibold text-ink-800 mb-3 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-stoneblue-600" />
                      体量尺寸
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="ink-label text-xs">长 cm</label>
                        <input type="number" className="ink-input"
                          value={form.length_cm}
                          onChange={e => setForm({ ...form, length_cm: +e.target.value })} />
                      </div>
                      <div>
                        <label className="ink-label text-xs">宽 cm</label>
                        <input type="number" className="ink-input"
                          value={form.width_cm}
                          onChange={e => setForm({ ...form, width_cm: +e.target.value })} />
                      </div>
                      <div>
                        <label className="ink-label text-xs">高 cm</label>
                        <input type="number" className="ink-input"
                          value={form.height_cm}
                          onChange={e => setForm({ ...form, height_cm: +e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-md bg-white/70 border border-stoneblue-100">
                        <p className="text-[10px] text-ink-500">估算体积</p>
                        <p className="font-mono font-bold text-stoneblue-700 text-sm mt-0.5">
                          {(computed.volume / 1_000_000).toFixed(3)} m³
                        </p>
                      </div>
                      <div className="p-3 rounded-md bg-white/70 border border-ochre-100">
                        <p className="text-[10px] text-ink-500">理论重量</p>
                        <p className="font-mono font-bold text-ochre-700 text-sm mt-0.5">
                          {computed.est_weight.toFixed(0)} kg
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="ink-label flex items-center gap-2">
                      <Weight className="w-4 h-4" />
                      实测重量 (kg)
                    </label>
                    <input type="number" className="ink-input font-mono"
                      value={form.weight_kg}
                      placeholder={`建议值: ${computed.est_weight.toFixed(0)}`}
                      onChange={e => setForm({ ...form, weight_kg: +e.target.value })} />
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-ochre-50 to-ink-50 border border-ochre-100/50">
                    <p className="font-song text-sm font-semibold text-ink-800 mb-4">形状特征 · 瘦皱漏透</p>
                    <div className="space-y-3.5">
                      <Slider label="瘦 (细挺高挑)" value={form.thinness}
                        onChange={v => setForm({ ...form, thinness: v })}
                        hint="高寬比越大，评分越高" />
                      <Slider label="皱 (皴纹丰富)" value={form.wrinkle}
                        onChange={v => setForm({ ...form, wrinkle: v })}
                        hint="表面纹理密度与层次" />
                      <Slider label="漏 (孔洞通透)" value={form.porosity}
                        onChange={v => setForm({ ...form, porosity: v })}
                        hint="孔洞率与贯通程度" />
                      <Slider label="透 (轮廓玲珑)" value={form.complexity}
                        onChange={v => setForm({ ...form, complexity: v })}
                        hint="边缘曲折与造型变化" />
                      <Slider label="棱角分明" value={form.edges}
                        onChange={v => setForm({ ...form, edges: v })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="ink-label">纹理方向</label>
                      <input className="ink-input text-sm" placeholder="纵向主皴"
                        value={form.texture_dir}
                        onChange={e => setForm({ ...form, texture_dir: e.target.value })} />
                    </div>
                    <div>
                      <label className="ink-label">备注说明</label>
                      <input className="ink-input text-sm" placeholder="用途、位置等"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button className="stoneblue-btn flex-1 justify-center flex items-center gap-2"
                      onClick={handleSave}
                      disabled={!form.name.trim()}>
                      <Save className="w-4 h-4" />
                      {editingId ? '保存修改' : '录入石库'}
                    </button>
                    <button className="ghost-btn" onClick={resetForm}>
                      重置
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-12 xl:col-span-7 space-y-4">
            <div className="scroll-card p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    placeholder="搜索石名/石号..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full rounded-md bg-white/70 border border-ink-200 text-sm
                               focus:outline-none focus:border-stoneblue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-ink-500" />
                  <select
                    value={filterMat}
                    onChange={e => setFilterMat(e.target.value as any)}
                    className="px-3 py-2 rounded-md bg-white/70 border border-ink-200 text-sm"
                  >
                    <option value="all">全部材质</option>
                    {(Object.keys(MATERIAL_NAMES) as StoneMaterial[]).map(m => (
                      <option key={m} value={m}>{MATERIAL_NAMES[m]}</option>
                    ))}
                  </select>
                </div>
                <span className="stat-pill bg-stoneblue-50 text-stoneblue-700 border border-stoneblue-100">
                  显示 {filtered.length} / {projectStones.length}
                </span>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="scroll-card p-16 text-center">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30 text-ink-400" />
                <p className="text-ink-500 font-song">暂无匹配的湖石档案</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((s, idx) => {
                  const avgScore = (s.thinness + s.wrinkle + s.porosity + s.complexity) / 4;
                  const sealStatus = avgScore >= 8 ? 'pass' : avgScore >= 6 ? 'warn' : 'danger';
                  return (
                    <div key={s.id} className="scroll-card p-4 hover:shadow-lg transition-all duration-300 ink-fade"
                      style={{ animationDelay: `${idx * 30}ms` }}>
                      <div className="flex items-start gap-4">
                        <div className={`w-16 h-20 rounded-lg bg-gradient-to-br ${materialColors[s.material]} flex items-center justify-center shadow-md relative overflow-hidden flex-shrink-0`}>
                          <div className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.5) 0%, transparent 40%)',
                            }} />
                          <span className="text-white font-bold font-song text-lg relative">{s.code.slice(-3)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-song font-bold text-ink-900 text-base">{s.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="stat-pill bg-ink-100 text-ink-700">{MATERIAL_NAMES[s.material]}</span>
                                <span className="stat-pill bg-stoneblue-50 text-stoneblue-700">{s.weight_kg}kg</span>
                                <span className="stat-pill bg-ochre-50 text-ochre-700">
                                  {s.length_cm}×{s.width_cm}×{s.height_cm}
                                </span>
                              </div>
                            </div>
                            <SealStamp status={sealStatus}
                              text={avgScore >= 8 ? '上品' : avgScore >= 6 ? '中品' : '常品'} />
                          </div>

                          <div className="mt-3 space-y-1.5">
                            {[
                              { k: '瘦', v: s.thinness, c: 'text-stoneblue-600' },
                              { k: '皱', v: s.wrinkle, c: 'text-ochre-600' },
                              { k: '漏', v: s.porosity, c: 'text-pine-600' },
                              { k: '透', v: s.complexity, c: 'text-cinnabar-600' },
                            ].map(d => (
                              <div key={d.k} className="flex items-center gap-2 text-xs">
                                <span className={`w-4 font-bold ${d.c}`}>{d.k}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                                  <div className={`h-full rounded-full bg-gradient-to-r ${
                                    d.v >= 8 ? 'from-pine-400 to-pine-600' :
                                    d.v >= 6 ? 'from-stoneblue-400 to-stoneblue-600' :
                                    d.v >= 4 ? 'from-ochre-400 to-ochre-600' : 'from-cinnabar-400 to-cinnabar-600'
                                  }`} style={{ width: `${d.v * 10}%` }} />
                                </div>
                                <span className="w-8 text-right font-mono text-ink-600">{d.v.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>

                          {s.notes && (
                            <p className="mt-2 text-[11px] text-ink-500 font-song border-l-2 border-ochre-300 pl-2 truncate">
                              {s.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-ink-100">
                            <button
                              onClick={() => handleEdit(s)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-stoneblue-700 hover:bg-stoneblue-50 transition-colors">
                              <Edit3 className="w-3 h-3" /> 编辑
                            </button>
                            <button
                              onClick={() => { if (confirm(`确认删除「${s.name}」？`)) stoneStore.removeStone(s.id); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-cinnabar-600 hover:bg-cinnabar-50 transition-colors ml-auto">
                              <Trash2 className="w-3 h-3" /> 删除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
