import { useMemo, useState } from 'react';
import Header, { ActionButton } from '@/components/layout/Header';
import { useStoneStore } from '@/store/stoneStore';
import { useStackStore } from '@/store/stackStore';
import { useParadigmStore } from '@/store/paradigmStore';
import SealStamp from '@/components/SealStamp';
import RadarChart from '@/components/RadarChart';
import {
  BookOpen,
  Star,
  Mountain,
  MapPin,
  Calendar,
  Weight,
  Ruler,
  Layers,
  Import,
  Save,
  Plus,
  Search,
  X,
  ChevronRight,
  Sparkles,
  Award,
  Compass,
  Trash2,
} from 'lucide-react';
import type { Paradigm } from '@/types/paradigm';
import { MATERIAL_NAMES, type StoneSupportType, type StackLayer } from '@/types/stone';

const STYLE_FILTERS = [
  { value: 'all', label: '全部流派' },
  { value: '环秀山庄式', label: '环秀山庄' },
  { value: '片石山房式', label: '片石山房' },
  { value: '豫园式', label: '豫园' },
  { value: '个园式', label: '个园' },
  { value: '苏州式', label: '苏州' },
  { value: '扬州式', label: '扬州' },
  { value: '岭南式', label: '岭南' },
  { value: '北方皇家', label: '北方皇家' },
];

const DIFFICULTY_COLORS = [
  '', 'bg-pine-100 text-pine-700', 'bg-stoneblue-100 text-stoneblue-700',
  'bg-ochre-100 text-ochre-700', 'bg-orange-100 text-orange-700', 'bg-cinnabar-100 text-cinnabar-700',
];

export default function ParadigmLibrary() {
  const { stones } = useStoneStore();
  const store = useStackStore();
  const paradigmStore = useParadigmStore();

  const [filter, setFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Paradigm | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveStyle, setSaveStyle] = useState<Paradigm['style']>('苏州式');
  const [saveDiff, setSaveDiff] = useState<Paradigm['difficulty']>(3);
  const [saveDesc, setSaveDesc] = useState('');

  const allParadigms = useMemo(
    () => paradigmStore.getAllParadigms(),
    [paradigmStore]
  );

  const filtered = useMemo(() => {
    return allParadigms.filter(p => {
      if (filter !== 'all' && p.style !== filter) return false;
      if (diffFilter > 0 && p.difficulty !== diffFilter) return false;
      if (search && !(p.name.includes(search) || p.garden.includes(search) || p.description.includes(search))) return false;
      return true;
    });
  }, [allParadigms, filter, diffFilter, search]);

  const currentScheme = store.schemes.find(s => s.id === store.currentSchemeId);
  const currentPlaced = store.getPlacedForScheme(store.currentSchemeId);
  const currentLayers = store.getLayersForScheme(store.currentSchemeId);

  const loadParadigm = (p: Paradigm) => {
    if (!confirm(`将载入范式「${p.name}」并清空当前堆叠，是否继续？`)) return;
    store.clearScheme();
    const scheme = store.schemes.find(s => s.id === store.currentSchemeId);
    if (scheme) {
      // Update scheme info
      const idx = store.schemes.findIndex(s => s.id === scheme.id);
      if (idx >= 0) {
        store.schemes[idx] = {
          ...scheme,
          name: `${p.name}（参考）`,
          description: p.description,
          base_length_cm: p.base_dimensions.length_cm,
          base_width_cm: p.base_dimensions.width_cm,
          updated_at: Date.now(),
        };
      }
    }

    // Create layers based on paradigm
    const createdLayers: { type: string; id: string; baseZ: number }[] = [];
    let accumZ = 0;
    const VALID_LAYER_TYPES = ['基础层', '主山层', '中层', '顶峦层', '配石层'] as const;
    for (const layer of p.layers) {
      const isValid = VALID_LAYER_TYPES.includes(layer.layer_type as any);
      const validType = (isValid ? layer.layer_type : '主山层') as StackLayer['layer_type'];
      const lyr = store.addLayer(validType, layer.name, accumZ);
      createdLayers.push({ type: layer.layer_type, id: lyr.id, baseZ: accumZ });
      accumZ += p.height_m * 100 * layer.height_ratio;
    }

    // Place stones with scaling
    const scaleX = p.base_dimensions.length_cm;
    const scaleY = p.base_dimensions.width_cm;
    const scaleZ = p.height_m * 100;
    const avgWeight = p.estimated_weight_ton * 1000 / Math.max(1, p.stone_count);
    const available = [...stones];

    const placedMap = new Map<string, string>();
    for (let li = 0; li < p.layers.length; li++) {
      const layer = p.layers[li];
      const lyr = createdLayers[li];
      for (let si = 0; si < layer.stones.length; si++) {
        const stone = layer.stones[si];
        // Select a real stone that's close to desired weight
        const desiredWeight = avgWeight * stone.relative_weight_ratio;
        let bestIdx = si % available.length;
        let bestDiff = Infinity;
        for (let ai = 0; ai < available.length; ai++) {
          const d = Math.abs(available[ai].weight_kg - desiredWeight);
          if (d < bestDiff) { bestDiff = d; bestIdx = ai; }
        }
        const actualStone = available[bestIdx];
        const supValid: StoneSupportType = ['叠','竖','横','挑','悬','安','连','接'].includes(stone.support_type)
          ? stone.support_type as StoneSupportType : '安';
        const ps = store.placeStone({
          stone_id: actualStone.id,
          layer_id: lyr.id,
          pos_x: Math.max(0, (stone.relative_position.x * scaleX) - actualStone.length_cm / 2),
          pos_y: Math.max(0, (stone.relative_position.y * scaleY) - actualStone.width_cm / 2),
          pos_z: lyr.baseZ + stone.relative_position.z * scaleZ,
          support_type: supValid,
          supported_by: si > 0 && li > 0
            ? Array.from(placedMap.values()).slice(0, Math.min(2, placedMap.size))
            : [],
          has_tie: stone.support_type === '挑',
          has_grout: li > 0,
        });
        placedMap.set(`${li}-${si}`, ps.id);
      }
    }

    setSelected(p);
    console.log(`%c✅ 范式「${p.name}」载入完成！请到重心校核页查看堆叠。`, 'color:#059669;font-weight:bold');
  };

  const saveCurrentAsParadigm = () => {
    if (currentPlaced.length === 0) {
      console.log('%c当前方案没有堆叠内容，无法保存为范式', 'color:#dc2626');
      return;
    }
    if (!saveName.trim()) { console.log('%c请输入范式名称', 'color:#dc2626'); return; }

    const totalW = currentPlaced.reduce((s, p) => s + (stones.find(st => st.id === p.stone_id)?.weight_kg ?? 0), 0);
    let maxZ = 0;
    for (const p of currentPlaced) {
      const st = stones.find(s => s.id === p.stone_id);
      maxZ = Math.max(maxZ, p.pos_z + (st?.height_cm ?? 0));
    }
    const avgThin = stones.length > 0 ? stones.reduce((s, x) => s + x.thinness, 0) / stones.length : 7;
    const avgWrk = stones.length > 0 ? stones.reduce((s, x) => s + x.wrinkle, 0) / stones.length : 7;
    const avgLeak = stones.length > 0 ? stones.reduce((s, x) => s + x.porosity, 0) / stones.length : 7;
    const avgThr = stones.length > 0 ? stones.reduce((s, x) => s + x.complexity, 0) / stones.length : 7;

    // Create layer skeletons
    const layerSkeletons = currentLayers.map(layer => {
      const layerPlaced = currentPlaced.filter(p => p.layer_id === layer.id);
      const maxLayerZ = layerPlaced.reduce((m, p) => Math.max(m, p.pos_z), 0);
      return {
        layer_type: layer.layer_type,
        name: layer.name,
        height_ratio: maxZ > 0 ? Math.min(0.5, (maxLayerZ + 80) / maxZ) : 0.25,
        stones: layerPlaced.map(ps => {
          const st = stones.find(s => s.id === ps.stone_id);
          return {
            stone_code: st?.code ?? 'ST-000',
            role: (
              ps.support_type === '挑' ? '挑石' :
              ps.support_type === '悬' ? '悬石' :
              layer.layer_type === '基础层' ? '压脚' :
              layer.layer_type === '顶峦层' ? '配石' : '主山'
            ) as any,
            relative_weight_ratio: totalW > 0 ? (st?.weight_kg ?? 100) / (totalW / currentPlaced.length) : 1,
            relative_position: {
              x: currentScheme ? ps.pos_x / currentScheme.base_length_cm : 0.5,
              y: currentScheme ? ps.pos_y / currentScheme.base_width_cm : 0.5,
              z: maxZ > 0 ? (ps.pos_z / maxZ) : 0,
            },
            support_type: ps.support_type,
            aesthetic_notes: st?.notes ?? st?.texture_dir ?? '',
          };
        }),
      };
    });

    const newParadigm: Paradigm = {
      id: `cus_${Date.now()}`,
      name: saveName,
      garden: '私家庭园',
      dynasty: '当代',
      style: saveStyle,
      difficulty: saveDiff,
      height_m: +(maxZ / 100).toFixed(1) || 3,
      base_dimensions: {
        length_cm: currentScheme?.base_length_cm ?? 600,
        width_cm: currentScheme?.base_width_cm ?? 400,
      },
      estimated_weight_ton: +(totalW / 1000).toFixed(1),
      stone_count: currentPlaced.length,
      layers: layerSkeletons.length > 0 ? layerSkeletons : [{ layer_type: '主山层', name: '主峰', height_ratio: 1, stones: [] }],
      score_overall: +((avgThin + avgWrk + avgLeak + avgThr) / 4 * 10).toFixed(1),
      score_thin: +(avgThin * 10).toFixed(0),
      score_wrinkle: +(avgWrk * 10).toFixed(0),
      score_leak: +(avgLeak * 10).toFixed(0),
      score_through: +(avgThr * 10).toFixed(0),
      description: saveDesc || '用户自定义堆叠范式',
      techniques: ['一石三居', '错缝咬合', '纹理贯通'],
      key_points: ['注重重心落于中心', '按照施工顺序分步就位'],
      image_thumb: 'cus_01',
      is_custom: true,
      created_at: Date.now(),
    };

    paradigmStore.addCustomParadigm(newParadigm);
    setShowSaveModal(false);
    setSaveName('');
    setSaveDesc('');
    console.log('%c✅ 已保存为自定义范式！关闭应用重新打开也会保留。', 'color:#059669;font-weight:bold');
  };

  const deleteCustom = (id: string) => {
    paradigmStore.removeCustomParadigm(id);
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="范式库"
        subtitle={`经典堆叠骨架 · 收录 ${allParadigms.length} 种范式 · 自定义 ${paradigmStore.customParadigms.length} 种`}
        actions={
          <>
            <ActionButton icon={BookOpen} variant="ghost">流派溯源</ActionButton>
            <ActionButton icon={Save} variant="secondary" onClick={() => setShowSaveModal(true)}>
              存为范式
              {currentPlaced.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-pine-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {currentPlaced.length}
                </span>
              )}
            </ActionButton>
            <ActionButton icon={Sparkles}>造园秘诀</ActionButton>
          </>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* 筛选与搜索栏 */}
        <div className="scroll-card mb-6">
          <div className="p-5 flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索范式名称、园林、技法..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 focus:border-stoneblue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {STYLE_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filter === f.value
                      ? 'bg-gradient-to-r from-stoneblue-600 to-ink-700 text-white shadow-md'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-500 mr-2">难度:</span>
              {[0, 1, 2, 3, 4, 5].map(d => (
                <button
                  key={d}
                  onClick={() => setDiffFilter(d)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                    diffFilter === d
                      ? 'bg-gradient-to-br from-ochre-400 to-ochre-600 text-white shadow'
                      : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                  }`}
                  title={d === 0 ? '全部' : `难度${d}星`}
                >
                  {d === 0 ? '全' : '★'.repeat(d)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 主卡片墙 */}
          <div className="col-span-8">
            <div className="grid grid-cols-2 gap-5">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`scroll-card cursor-pointer transition-all duration-300 group ${
                    selected?.id === p.id ? 'ring-2 ring-stoneblue-500 ring-offset-2 shadow-xl scale-[1.01]' : 'hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {/* 顶部园林缩略（用SVG模拟） */}
                  <div className="relative h-36 overflow-hidden rounded-t-2xl border-b border-ink-200">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg,
                          ${p.style.includes('岭南') ? '#4a9b8322' : p.style.includes('皇家') ? '#a0522d22' : '#5c6b7a22'} 0%,
                          #f5f1e8 50%,
                          ${p.style.includes('豫园') ? '#b8860b22' : p.style.includes('个园') ? '#c2410c22' : '#78716c22'} 100%)`,
                      }}
                    />
                    <svg viewBox="0 0 400 160" className="absolute inset-0 w-full h-full">
                      {/* 远山 */}
                      <path d="M0,120 Q50,80 100,100 T200,90 T300,100 T400,85 L400,160 L0,160Z" fill="#b8a082" opacity="0.25" />
                      {/* 主山 */}
                      {p.layers.map((layer, li) => (
                        layer.stones.map((st, si) => {
                          const cx = 60 + st.relative_position.x * 280;
                          const baseY = 145 - st.relative_position.z * 110;
                          const w = 25 + st.relative_weight_ratio * 15;
                          const h = 20 + st.relative_weight_ratio * 18;
                          const pal = ['#8b7355', '#5c6b7a', '#7a5c3e', '#a0522d', '#4a9b83'];
                          return (
                            <g key={`${li}-${si}`}>
                              <ellipse
                                cx={cx} cy={baseY - h / 2} rx={w / 2} ry={h / 2}
                                fill={pal[(li + si) % pal.length]} opacity="0.85"
                              />
                              <path
                                d={`M${cx - w / 2 + 4},${baseY - h * 0.3} Q${cx - w / 3},${baseY - h + 6} ${cx},${baseY - h * 0.7}`}
                                fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"
                              />
                            </g>
                          );
                        })
                      ))}
                      {/* 水波纹 */}
                      <path d="M0,148 Q50,144 100,148 T200,148 T300,148 T400,148 L400,160 L0,160Z" fill="#5c6b7a" opacity="0.12" />
                    </svg>

                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow ${DIFFICULTY_COLORS[p.difficulty]}`}>
                        {'★'.repeat(p.difficulty)}
                      </span>
                      {p.is_custom && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-pine-600 text-white shadow">
                          我的
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <SealStamp
                        status={p.score_overall >= 92 ? 'pass' : p.score_overall >= 85 ? 'warn' : 'danger'}
                        size="md"
                        text={`${p.score_overall}分`}
                      />
                    </div>
                    <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-ink-600 opacity-80 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{p.garden}
                        </p>
                        <h3 className="text-lg font-bold font-song text-ink-900 drop-shadow-sm">{p.name}</h3>
                      </div>
                      <div className="flex items-center gap-0.5 text-xs text-ochre-700 font-bold">
                        {Array.from({ length: Math.round(p.score_overall / 20) }).map((_, i) => (
                          <Award key={i} className="w-3.5 h-3.5 fill-ochre-400" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 卡片底部信息 */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3 text-xs text-ink-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{p.dynasty}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5" />{p.style}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                      <div className="bg-ink-50 rounded-lg py-2">
                        <Ruler className="w-3.5 h-3.5 mx-auto text-stoneblue-600 mb-0.5" />
                        <p className="text-[10px] text-ink-500">高度</p>
                        <p className="font-bold text-sm text-ink-800">{p.height_m}m</p>
                      </div>
                      <div className="bg-ink-50 rounded-lg py-2">
                        <Weight className="w-3.5 h-3.5 mx-auto text-ochre-600 mb-0.5" />
                        <p className="text-[10px] text-ink-500">重量</p>
                        <p className="font-bold text-sm text-ink-800">{p.estimated_weight_ton}t</p>
                      </div>
                      <div className="bg-ink-50 rounded-lg py-2">
                        <Layers className="w-3.5 h-3.5 mx-auto text-pine-600 mb-0.5" />
                        <p className="text-[10px] text-ink-500">层数</p>
                        <p className="font-bold text-sm text-ink-800">{p.layers.length}</p>
                      </div>
                      <div className="bg-ink-50 rounded-lg py-2">
                        <Mountain className="w-3.5 h-3.5 mx-auto text-cinnabar-600 mb-0.5" />
                        <p className="text-[10px] text-ink-500">石数</p>
                        <p className="font-bold text-sm text-ink-800">{p.stone_count}</p>
                      </div>
                    </div>
                    <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed mb-3">{p.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-ink-100">
                      <div className="flex -space-x-1">
                        {['瘦', '皱', '漏', '透'].map((k, i) => {
                          const v = [p.score_thin, p.score_wrinkle, p.score_leak, p.score_through][i];
                          const clr = ['bg-stoneblue-500', 'bg-pine-500', 'bg-ochre-500', 'bg-cinnabar-500'][i];
                          return (
                            <div
                              key={k}
                              className={`w-7 h-7 rounded-full ${clr} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}
                              title={`${k}: ${v}`}
                            >
                              {k}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); loadParadigm(p); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-stoneblue-600 to-ink-700 text-white text-xs font-bold hover:shadow-md transition"
                      >
                        <Import className="w-3.5 h-3.5" />载入
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="col-span-2 scroll-card">
                  <div className="text-center py-20 text-ink-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">未找到匹配的范式</p>
                    <p className="text-sm mt-2">请尝试调整筛选条件</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧详情面板 */}
          <div className="col-span-4">
            <div className="scroll-card sticky top-6">
              {selected ? (
                <div>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
                    <h3 className="font-bold font-song text-lg text-ink-800">范式详情</h3>
                    <div className="flex gap-1">
                      {selected.is_custom && (
                        <button
                          onClick={() => deleteCustom(selected.id)}
                          className="p-1.5 rounded-lg text-cinnabar-600 hover:bg-cinnabar-50 transition"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelected(null)}
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-5 max-h-[75vh] overflow-auto">
                    <div className="text-center p-4 bg-gradient-to-br from-ink-50 to-white rounded-xl border border-ink-200">
                      <h2 className="text-xl font-bold font-song text-ink-900">{selected.name}</h2>
                      <p className="text-sm text-ink-600 mt-1">{selected.garden} · {selected.dynasty}</p>
                      <p className="text-xs mt-2 text-stoneblue-700 font-semibold tracking-wide">{selected.style}</p>
                    </div>

                    <RadarChart
                      dimensions={[
                        { key: 'thin', label: '瘦', value: selected.score_thin },
                        { key: 'wrinkle', label: '皱', value: selected.score_wrinkle },
                        { key: 'leak', label: '漏', value: selected.score_leak },
                        { key: 'through', label: '透', value: selected.score_through },
                        { key: 'overall', label: '合', value: selected.score_overall },
                      ]}
                      reference={{ label: '经典线', values: [85, 85, 85, 85, 88] }}
                      size={200}
                      max={100}
                    />

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-ink-700 flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-ochre-600" />核心技法
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.techniques.map(t => (
                          <span key={t} className="px-2.5 py-1 rounded-full bg-stoneblue-50 text-stoneblue-700 text-xs font-semibold border border-stoneblue-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-ink-700 flex items-center gap-1">
                        <Award className="w-4 h-4 text-pine-600" />营造要点
                      </h4>
                      <div className="space-y-2">
                        {selected.key_points.map((kp, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 bg-pine-50/60 rounded-lg border-l-2 border-pine-500">
                            <span className="font-bold text-pine-700 text-sm shrink-0">第{i + 1}条</span>
                            <p className="text-xs text-ink-700 leading-relaxed">{kp}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-ink-700 flex items-center gap-1">
                        <Layers className="w-4 h-4 text-cinnabar-600" />层级骨架
                      </h4>
                      <div className="space-y-2">
                        {selected.layers.map((layer, li) => (
                          <div key={li} className="p-3 bg-gradient-to-r from-ink-50 to-white rounded-xl border border-ink-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-ink-700 to-ink-900 text-white text-xs font-bold flex items-center justify-center">
                                  {li + 1}
                                </span>
                                <span className="font-bold text-sm text-ink-800">{layer.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">{layer.layer_type}</span>
                              </div>
                              <span className="text-xs font-mono text-ink-500">{(layer.height_ratio * 100).toFixed(0)}%高</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                              {layer.stones.map((st, si) => (
                                <div key={si} className="flex items-center gap-2 text-xs p-1.5 bg-white rounded border border-ink-100">
                                  <span className="w-5 h-5 rounded bg-stoneblue-100 text-stoneblue-700 font-bold flex items-center justify-center text-[10px]">
                                    {st.role.slice(0, 1)}
                                  </span>
                                  <span className="font-mono text-ink-600">{st.stone_code}</span>
                                  <span className="text-ink-500">[{st.support_type}]</span>
                                  <span className="ml-auto text-ink-400">×{st.relative_weight_ratio.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => loadParadigm(selected)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-stoneblue-600 via-ink-700 to-cinnabar-600 text-white font-bold shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <Import className="w-5 h-5" />载入此范式到当前方案
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-ink-500">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-ink-600">请选择一个范式</p>
                  <p className="text-sm mt-2">查看详细营造技法与骨架结构</p>
                  <div className="mt-6 p-4 bg-ink-50 rounded-xl text-left space-y-2">
                    <p className="text-xs text-ink-600 leading-relaxed">
                      💡 <span className="font-bold">范式库使用指南：</span>
                    </p>
                    <ul className="text-xs text-ink-600 space-y-1 list-disc pl-4">
                      <li>浏览6大江南名园与北方皇家园林经典案例</li>
                      <li>点击「载入」可将骨架一键应用至当前方案</li>
                      <li>完成满意方案后点「存为范式」收录个人经验</li>
                      <li>可按流派、营造难度、评分等维度筛选</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 保存为范式弹窗 */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-ink-50 w-full max-w-lg rounded-3xl shadow-2xl border border-ink-200 overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between bg-gradient-to-r from-stoneblue-600 to-ink-700">
                <h3 className="font-bold font-song text-xl text-white flex items-center gap-2">
                  <Save className="w-5 h-5" />保存为自定义范式
                </h3>
                <button onClick={() => setShowSaveModal(false)} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-ink-700 block mb-1.5">范式名称 *</label>
                  <input
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder="例：庭园小景三峰式"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink-200 focus:border-stoneblue-500 focus:outline-none transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-ink-700 block mb-1.5">流派风格</label>
                    <select
                      value={saveStyle}
                      onChange={e => setSaveStyle(e.target.value as Paradigm['style'])}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink-200 focus:border-stoneblue-500 focus:outline-none transition"
                    >
                      {STYLE_FILTERS.filter(f => f.value !== 'all').map(f => (
                        <option key={f.value} value={f.value}>{f.label}式</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-ink-700 block mb-1.5">
                      难度评级 <span className="text-ochre-600">{'★'.repeat(saveDiff)}</span>
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(d => (
                        <button
                          key={d}
                          onClick={() => setSaveDiff(d as Paradigm['difficulty'])}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                            saveDiff === d ? 'bg-gradient-to-br from-ochre-400 to-ochre-600 text-white shadow' : 'bg-white border border-ink-200 text-ink-500 hover:bg-ink-50'
                          }`}
                        >
                          {'★'.repeat(d)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink-700 block mb-1.5">营造说明</label>
                  <textarea
                    value={saveDesc}
                    onChange={e => setSaveDesc(e.target.value)}
                    placeholder="简述此范式的适用场景、营造要点、审美特征..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink-200 focus:border-stoneblue-500 focus:outline-none transition resize-none"
                  />
                </div>
                <div className="p-3 bg-stoneblue-50/60 rounded-xl border border-stoneblue-200">
                  <p className="text-xs font-semibold text-stoneblue-700 mb-1.5">📋 将收录的堆叠内容</p>
                  <div className="grid grid-cols-4 gap-2 text-xs text-ink-600">
                    <div>方案石数：<b className="text-ink-800">{currentPlaced.length}</b></div>
                    <div>分层数：<b className="text-ink-800">{currentLayers.length}</b></div>
                    <div>基底：<b className="text-ink-800">{currentScheme?.base_length_cm ?? 600}cm</b></div>
                    <div>石料库：<b className="text-ink-800">{stones.length}种</b></div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-ink-200 bg-ink-100/50 flex gap-3 justify-end">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white border border-ink-200 text-ink-700 font-semibold hover:bg-ink-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={saveCurrentAsParadigm}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pine-600 to-pine-700 text-white font-bold shadow hover:shadow-lg transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />收录范式
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
