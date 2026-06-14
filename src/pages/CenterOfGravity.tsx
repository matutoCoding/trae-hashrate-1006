import { useEffect, useMemo, useState } from 'react';
import Header, { ActionButton } from '@/components/layout/Header';
import { useStoneStore } from '@/store/stoneStore';
import { useStackStore } from '@/store/stackStore';
import { computeCenterOfGravity } from '@/utils/geometry';
import { computeAestheticScore } from '@/utils/aesthetics';
import RadarChart from '@/components/RadarChart';
import SealStamp from '@/components/SealStamp';
import { MATERIAL_NAMES, type StoneSupportType, type StackLayer } from '@/types/stone';
import { Plus, Layers, Trash2, Calculator, Crosshair, MapPin, RefreshCw, Zap, X } from 'lucide-react';

const LAYER_TYPES: Array<{ type: '基础层' | '主山层' | '中层' | '顶峦层' | '配石层'; color: string; icon: string }> = [
  { type: '基础层', color: 'from-ochre-600 to-ochre-700', icon: '基' },
  { type: '主山层', color: 'from-stoneblue-600 to-stoneblue-700', icon: '主' },
  { type: '中层', color: 'from-pine-600 to-pine-700', icon: '中' },
  { type: '顶峦层', color: 'from-ink-600 to-ink-700', icon: '顶' },
  { type: '配石层', color: 'from-cinnabar-600 to-cinnabar-700', icon: '配' },
];

const SUPPORT_TYPES: StoneSupportType[] = ['叠', '竖', '横', '挑', '悬', '安', '连', '接'];

export default function CenterOfGravity() {
  const { stones, getStoneMap } = useStoneStore();
  const store = useStackStore();
  const scheme = store.schemes.find(s => s.id === store.currentSchemeId)
    ?? (store.schemes.length === 0 ? store.createScheme('默认假山方案', '示例方案', 600, 400) : store.schemes[0]);

  const layers = store.getLayersForScheme(scheme.id);
  const placed = store.getPlacedForScheme(scheme.id);
  const stoneMap = getStoneMap();

  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [selectedPlaced, setSelectedPlaced] = useState<string | null>(null);
  const [view, setView] = useState<'x' | 'y'>('x');
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [newLayerType, setNewLayerType] = useState<StackLayer['layer_type']>('中层');
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerBaseZ, setNewLayerBaseZ] = useState(150);

  const submitAddLayer = () => {
    const nm = newLayerName.trim() || `${newLayerType}-${layers.length + 1}`;
    store.addLayer(newLayerType, nm, newLayerBaseZ);
    setShowAddLayer(false);
    setNewLayerName('');
    setNewLayerType('中层');
    const total = placed.length > 0 ? Math.max(...placed.map(p => p.pos_z + (stoneMap.get(p.stone_id)?.height_cm ?? 0))) : 0;
    setNewLayerBaseZ(Math.round(total + 30));
    console.log(`%c✅ 已新增层「${nm}」，请在左侧层次列表展开后添加湖石。`, 'color:#2563eb;font-weight:bold');
  };

  useEffect(() => {
    if (layers.length === 0) {
      store.addLayer('基础层', '基座层', 0);
      store.addLayer('主山层', '主峰层', 80);
      store.addLayer('中层', '配石中层', 200);
      store.addLayer('顶峦层', '收顶层', 320);
    }
  }, [layers.length, store]);

  const cgResult = useMemo(
    () => computeCenterOfGravity(scheme, layers, placed, stoneMap),
    [scheme, layers, placed, stoneMap]
  );

  const aesthetic = useMemo(
    () => computeAestheticScore(placed, stoneMap, layers),
    [placed, stoneMap, layers]
  );

  const totalWeight = placed.reduce((s, p) => s + (stoneMap.get(p.stone_id)?.weight_kg ?? 0), 0);
  const maxH = placed.reduce((m, p) => {
    const st = stoneMap.get(p.stone_id);
    return Math.max(m, p.pos_z + (st?.height_cm ?? 0));
  }, 0);

  const sealStatus = cgResult.is_within_support
    ? cgResult.stability_margin_percent >= 20 ? 'pass' : 'warn'
    : 'danger';

  const addDemoStones = () => {
    if (placed.length > 0) {
      if (!confirm('将清除现有堆叠，继续吗？')) return;
    }
    store.clearScheme();
    const l1 = store.addLayer('基础层', '基座层');
    const l2 = store.addLayer('主山层', '主峰层');
    const l3 = store.addLayer('中层', '配石中层');
    const l4 = store.addLayer('顶峦层', '收顶层');

    const sBase = stones[1] ?? stones[0];
    const sBase2 = stones[3] ?? stones[0];
    const sMain = stones[0] ?? stones[0];
    const sOver = stones[2] ?? stones[0];
    const sTop = stones[7] ?? stones[0];

    // 压脚石1（左）
    const p1 = store.placeStone({
      stone_id: sBase.id, layer_id: l1.id,
      pos_x: 50, pos_y: 120, pos_z: 0,
      support_type: '叠',
      contact_points: [
        { x: 50 + sBase.length_cm * 0.3, y: 120 + sBase.width_cm * 0.2, z: sBase.height_cm, area_cm2: 85 },
        { x: 50 + sBase.length_cm * 0.7, y: 120 + sBase.width_cm * 0.5, z: sBase.height_cm, area_cm2: 92 },
        { x: 50 + sBase.length_cm * 0.5, y: 120 + sBase.width_cm * 0.8, z: sBase.height_cm, area_cm2: 78 },
      ],
    });
    // 压脚石2（右）
    const p2 = store.placeStone({
      stone_id: sBase2.id, layer_id: l1.id,
      pos_x: 380, pos_y: 120, pos_z: 0,
      support_type: '叠',
      contact_points: [
        { x: 380 + sBase2.length_cm * 0.3, y: 120 + sBase2.width_cm * 0.3, z: sBase2.height_cm, area_cm2: 95 },
        { x: 380 + sBase2.length_cm * 0.7, y: 120 + sBase2.width_cm * 0.5, z: sBase2.height_cm, area_cm2: 88 },
      ],
    });
    // 主山石（竖）
    const p3 = store.placeStone({
      stone_id: sMain.id, layer_id: l2.id,
      pos_x: 200, pos_y: 140, pos_z: 85,
      support_type: '竖', supported_by: [p1.id, p2.id],
      has_grout: true,
      contact_points: [
        { x: 210, y: 155, z: 85, area_cm2: 65 },
        { x: 280, y: 175, z: 85, area_cm2: 72 },
        { x: 230, y: 190, z: 85, area_cm2: 58 },
      ],
    });
    // 挑石
    store.placeStone({
      stone_id: sOver.id, layer_id: l3.id,
      pos_x: 350, pos_y: 150, pos_z: 210,
      support_type: '挑', supported_by: [p3.id],
      has_tie: true, has_grout: true,
      contact_points: [
        { x: 355, y: 160, z: 210, area_cm2: 45 },
        { x: 380, y: 170, z: 210, area_cm2: 40 },
      ],
    });
    // 顶巅小品
    store.placeStone({
      stone_id: sTop.id, layer_id: l4.id,
      pos_x: 220, pos_y: 140, pos_z: 330,
      support_type: '安', supported_by: [p3.id],
      has_grout: true,
      contact_points: [
        { x: 230, y: 155, z: 330, area_cm2: 32 },
        { x: 250, y: 162, z: 330, area_cm2: 28 },
      ],
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="重心校核"
        subtitle={`${scheme.name} · ${placed.length} 方湖石 · 总重 ${(totalWeight / 1000).toFixed(2)} 吨 · 高 ${maxH / 100}m`}
        actions={
          <>
            <ActionButton icon={RefreshCw} variant="ghost" onClick={addDemoStones}>
              {placed.length > 0 ? '重置示例' : '载入示例'}
            </ActionButton>
            <ActionButton icon={Calculator} variant="secondary">
              方案设置
            </ActionButton>
            <ActionButton icon={Plus} onClick={() => {
              const total = placed.length > 0 ? Math.max(...placed.map(p => p.pos_z + (stoneMap.get(p.stone_id)?.height_cm ?? 0))) : 0;
              setNewLayerBaseZ(Math.round(total + 30));
              setShowAddLayer(true);
            }}>
              新增层
            </ActionButton>
          </>
        }
      />

      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-3 space-y-4">
            <div className="scroll-card p-5">
              <h3 className="section-title flex items-center gap-2">
                <Layers className="w-5 h-5 text-stoneblue-600" />
                堆叠层次
              </h3>
              <div className="space-y-2">
                {layers.map((l, idx) => {
                  const layerInfo = LAYER_TYPES.find(t => t.type === l.layer_type) ?? LAYER_TYPES[1];
                  const stonesInLayer = placed.filter(p => p.layer_id === l.id);
                  const isActive = selectedLayer === l.id;
                  return (
                    <div key={l.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isActive ? 'border-stoneblue-400 bg-stoneblue-50/60 shadow-md' : 'border-ink-200/60 bg-white/50 hover:border-stoneblue-300 hover:bg-stoneblue-50/30'
                      }`}
                      onClick={() => setSelectedLayer(isActive ? null : l.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${layerInfo.color} text-white font-bold flex items-center justify-center text-sm shadow-md`}>
                          {layerInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-song font-semibold text-sm text-ink-800">{l.name}</p>
                          <p className="text-[10px] text-ink-500">第{idx + 1}层 · {l.layer_type} · 基准 {l.base_height_cm}cm</p>
                        </div>
                        <span className="stat-pill bg-ink-100 text-ink-700">
                          {stonesInLayer.length}
                        </span>
                      </div>
                      {isActive && (
                        <div className="mt-3 pt-3 border-t border-ink-100 space-y-2">
                          <select
                            className="ink-input text-sm"
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const stId = e.target.value;
                              if (!stId) return;
                              store.placeStone({
                                stone_id: stId, layer_id: l.id,
                                pos_x: 100 + Math.random() * 300,
                                pos_y: 100 + Math.random() * 150,
                                pos_z: l.base_height_cm,
                                support_type: '安',
                              });
                            }}
                            defaultValue=""
                          >
                            <option value="">+ 添加湖石到此层...</option>
                            {stones.map(s => (
                              <option key={s.id} value={s.id}>{s.code} - {s.name} ({s.weight_kg}kg)</option>
                            ))}
                          </select>
                          {stonesInLayer.map(p => {
                            const st = stoneMap.get(p.stone_id);
                            return (
                              <div key={p.id}
                                onClick={e => { e.stopPropagation(); setSelectedPlaced(p.id); }}
                                className={`flex items-center gap-2 p-2 rounded text-xs ${
                                  selectedPlaced === p.id ? 'bg-stoneblue-100 ring-1 ring-stoneblue-400' : 'bg-ink-50 hover:bg-ink-100'
                                }`}>
                                <span className="font-mono text-ink-500">{st?.code}</span>
                                <span className="font-song text-ink-800 flex-1 truncate">{st?.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-ochre-100 text-ochre-700 text-[10px]">{p.support_type}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); store.removePlaced(p.id); }}
                                  className="p-1 rounded hover:bg-cinnabar-50 text-cinnabar-500">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="scroll-card p-5">
              <h3 className="section-title flex items-center gap-2">
                <Zap className="w-5 h-5 text-ochre-600" />
                审美评分 · 瘦皱漏透
              </h3>
              <RadarChart dimensions={[
                { key: 'thin', label: '瘦', value: aesthetic.thin },
                { key: 'wrinkle', label: '皱', value: aesthetic.wrinkle },
                { key: 'leak', label: '漏', value: aesthetic.leak },
                { key: 'through', label: '透', value: aesthetic.through },
                { key: 'harmony', label: '谐', value: aesthetic.harmony },
              ]} reference={{ label: '环秀山庄', values: [92, 98, 97, 95, 95] }} size={220} max={100} />
              <div className="mt-4 text-center">
                <p className="text-xs text-ink-500">综合评分</p>
                <p className="font-song font-bold text-3xl text-stoneblue-700">{aesthetic.overall}<span className="text-base text-ink-500">分</span></p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                  aesthetic.grade === '精品' ? 'bg-pine-100 text-pine-700' :
                  aesthetic.grade === '佳品' ? 'bg-stoneblue-100 text-stoneblue-700' :
                  aesthetic.grade === '良品' ? 'bg-ochre-100 text-ochre-700' :
                  aesthetic.grade === '合格' ? 'bg-ink-100 text-ink-700' :
                  'bg-cinnabar-100 text-cinnabar-700'
                }`}>{aesthetic.grade}</span>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-6">
            <div className="scroll-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title !mb-0 flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-stoneblue-600" />
                  堆叠剖面与重心轨迹
                </h3>
                <div className="flex gap-1 p-1 bg-ink-100 rounded-md">
                  {[{ k: 'x', l: 'X-Z 正视' }, { k: 'y', l: 'Y-Z 侧视' }].map(v => (
                    <button key={v.k}
                      onClick={() => setView(v.k as any)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        view === v.k ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                      }`}>
                      {v.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative bg-gradient-to-b from-ink-50 to-stoneblue-50/40 rounded-lg border border-ink-200/60 overflow-hidden"
                style={{ height: '520px' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${scheme.base_length_cm + 100} ${Math.max(maxH + 120, 600)}`}
                  preserveAspectRatio="xMidYMax meet">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(154,138,106,0.15)" strokeWidth="1" />
                    </pattern>
                    <linearGradient id="baseFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(74,124,155,0.15)" />
                      <stop offset="100%" stopColor="rgba(74,124,155,0.05)" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width={scheme.base_length_cm + 100} height={Math.max(maxH + 120, 600)} fill="url(#grid)" />

                  <rect x="50" y={Math.max(maxH + 80, 560)} width={scheme.base_length_cm} height="40"
                    fill="url(#baseFill)" stroke="rgba(160,82,45,0.6)" strokeWidth="2" strokeDasharray="6,4" />
                  <text x={50 + scheme.base_length_cm / 2} y={Math.max(maxH + 80, 560) + 26}
                    textAnchor="middle" fill="#7d6c4d" fontSize="12" fontFamily="serif">
                    基底支撑面（{scheme.base_length_cm}×{scheme.base_width_cm}cm）
                  </text>

                  {layers.map((l, i) => (
                    <g key={l.id}>
                      <line x1="50" y1={Math.max(maxH + 80, 560) - l.base_height_cm}
                        x2={50 + scheme.base_length_cm} y2={Math.max(maxH + 80, 560) - l.base_height_cm}
                        stroke="rgba(74,124,155,0.25)" strokeWidth="1" strokeDasharray="3,3" />
                      <text x="45" y={Math.max(maxH + 80, 560) - l.base_height_cm + 4}
                        textAnchor="end" fill="#9a8a6a" fontSize="10" fontFamily="serif">
                        L{i + 1} {l.base_height_cm}cm
                      </text>
                    </g>
                  ))}

                  {placed.map((p, idx) => {
                    const st = stoneMap.get(p.stone_id);
                    if (!st) return null;
                    const baseY = Math.max(maxH + 80, 560);
                    const x = 50 + p.pos_x;
                    const w = view === 'x' ? st.length_cm : st.width_cm;
                    const h = st.height_cm;
                    const y = baseY - p.pos_z - h;
                    const colorMap: Record<string, string> = {
                      TAIHU: 'rgba(74,124,155,0.7)', YING: 'rgba(42,37,32,0.75)',
                      HUANG: 'rgba(160,82,45,0.7)', LINGBI: 'rgba(26,26,46,0.78)',
                    };
                    const fill = colorMap[st.material] ?? 'rgba(100,100,100,0.7)';
                    const isSelected = selectedPlaced === p.id;
                    return (
                      <g key={p.id} style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedPlaced(isSelected ? null : p.id)}
                        className="ink-fade">
                        <rect x={x} y={y} width={w} height={h} rx="6" ry="6"
                          fill={fill}
                          stroke={isSelected ? '#c2410c' : 'rgba(26,26,46,0.6)'}
                          strokeWidth={isSelected ? 3 : 1.5}
                          style={{ filter: isSelected ? 'drop-shadow(0 4px 8px rgba(194,65,12,0.3))' : 'drop-shadow(0 2px 4px rgba(26,26,46,0.15))' }} />
                        <text x={x + w / 2} y={y + h / 2 + 4}
                          textAnchor="middle" fill="white" fontSize="11" fontWeight="bold"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                          {st.code.slice(-3)}
                        </text>
                        <text x={x + w / 2} y={y - 6}
                          textAnchor="middle" fill="#5e5039" fontSize="9" fontFamily="serif">
                          {p.support_type}
                        </text>
                      </g>
                    );
                  })}

                  {cgResult.layer_cgs.length >= 2 && (
                    <g>
                      {cgResult.layer_cgs.map((lc, i) => {
                        const baseY = Math.max(maxH + 80, 560);
                        const cx = 50 + cgResult.projection_x;
                        const cy = baseY - lc.cg.z;
                        const prev = cgResult.layer_cgs[i - 1];
                        return (
                          <g key={lc.layer_id}>
                            {prev && (
                              <line x1={50 + prev.cg.x} y1={baseY - prev.cg.z}
                                x2={cx} y2={cy}
                                stroke="#c2410c" strokeWidth="2" strokeDasharray="5,4" opacity="0.7" />
                            )}
                            <circle cx={cx} cy={cy} r="7" fill="#c2410c" fillOpacity="0.15" stroke="#c2410c" strokeWidth="2" />
                            <circle cx={cx} cy={cy} r="3" fill="#c2410c" />
                          </g>
                        );
                      })}
                      <line x1={50 + cgResult.projection_x}
                        y1={Math.max(maxH + 80, 560) - cgResult.overall_cg.z}
                        x2={50 + cgResult.projection_x}
                        y2={Math.max(maxH + 80, 560)}
                        stroke="#a0522d" strokeWidth="2" strokeDasharray="4,3" opacity="0.6" />
                      <circle cx={50 + cgResult.projection_x} cy={Math.max(maxH + 80, 560)} r="10"
                        fill={cgResult.is_within_support ? 'rgba(74,155,131,0.3)' : 'rgba(194,65,12,0.3)'}
                        stroke={cgResult.is_within_support ? '#4a9b83' : '#c2410c'} strokeWidth="2" />
                      <circle cx={50 + cgResult.projection_x} cy={Math.max(maxH + 80, 560)} r="4"
                        fill={cgResult.is_within_support ? '#4a9b83' : '#c2410c'} />
                    </g>
                  )}
                </svg>

                <div className="absolute top-4 right-4">
                  <SealStamp status={sealStatus}
                    text={cgResult.is_within_support ? (cgResult.stability_margin_percent >= 20 ? '稳定' : '临界') : '失稳'} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-3 space-y-4">
            <div className="scroll-card p-5">
              <h3 className="section-title flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cinnabar-600" />
                重心计算结果
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-stoneblue-50 to-pine-50 border border-stoneblue-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-ink-600">整体重心坐标</span>
                    <MapPin className="w-4 h-4 text-stoneblue-600" />
                  </div>
                  <div className="font-mono text-sm font-bold text-ink-800">
                    X: {cgResult.overall_cg.x.toFixed(0)} ·
                    Y: {cgResult.overall_cg.y.toFixed(0)} ·
                    Z: {cgResult.overall_cg.z.toFixed(0)} cm
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-md bg-white/70 border border-ink-100">
                    <p className="text-[10px] text-ink-500 mb-0.5">偏心距</p>
                    <p className="font-mono font-bold text-ink-800">{cgResult.eccentricity_cm}<span className="text-xs text-ink-500 ml-1">cm</span></p>
                  </div>
                  <div className="p-3 rounded-md bg-white/70 border border-ink-100">
                    <p className="text-[10px] text-ink-500 mb-0.5">距最近边</p>
                    <p className="font-mono font-bold text-ink-800">{cgResult.nearest_edge_distance_cm}<span className="text-xs text-ink-500 ml-1">cm</span></p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-br from-ochre-50 to-cinnabar-50/50 border border-ochre-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-ink-800">稳定裕度</span>
                    <span className={`font-bold text-lg ${
                      cgResult.stability_margin_percent >= 20 ? 'text-pine-600' :
                      cgResult.stability_margin_percent >= 0 ? 'text-ochre-600' : 'text-cinnabar-600'
                    }`}>
                      {cgResult.stability_margin_percent > 0 ? '+' : ''}{cgResult.stability_margin_percent}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-ink-100 overflow-hidden relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ink-400 z-10" />
                    <div
                      className={`h-full transition-all duration-700 ${
                        cgResult.stability_margin_percent >= 20 ? 'bg-gradient-to-r from-pine-400 to-pine-600' :
                        cgResult.stability_margin_percent >= 0 ? 'bg-gradient-to-r from-ochre-400 to-ochre-600' :
                        'bg-gradient-to-r from-cinnabar-400 to-cinnabar-600'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.abs(cgResult.stability_margin_percent))}%`,
                        marginLeft: cgResult.stability_margin_percent >= 0 ? '50%' : `${50 - Math.abs(cgResult.stability_margin_percent) / 2}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-500 mt-1">
                    <span>越出基底</span><span>基底中心</span><span>安全区</span>
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-3">
                  <p className="text-xs text-ink-600 font-semibold mb-2">分层重心 · 重量分布</p>
                  <div className="space-y-1.5">
                    {cgResult.layer_cgs.map((lc, i) => (
                      <div key={lc.layer_id} className="flex items-center gap-2 text-xs">
                        <span className="w-12 text-ink-500">L{i + 1}</span>
                        <div className="flex-1 h-5 rounded bg-ink-100 overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-stoneblue-400 to-stoneblue-600 flex items-center pr-2"
                            style={{ width: `${totalWeight > 0 ? (lc.total_weight_kg / totalWeight) * 100 : 0}%` }}>
                            <span className="ml-auto text-white font-bold text-[10px]"
                              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                              {lc.total_weight_kg.toFixed(0)}kg
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {selectedPlaced && (() => {
              const p = placed.find(x => x.id === selectedPlaced);
              const st = p ? stoneMap.get(p.stone_id) : null;
              if (!p || !st) return null;
              return (
                <div className="scroll-card p-5 ink-fade">
                  <h3 className="section-title text-sm">选中湖石参数</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-ink-600">石名</span><span className="font-song font-bold">{st.name}</span></div>
                    <div className="flex justify-between"><span className="text-ink-600">材质</span><span>{MATERIAL_NAMES[st.material]}</span></div>
                    <div className="flex justify-between"><span className="text-ink-600">重量</span><span className="font-mono">{st.weight_kg} kg</span></div>
                    <div className="flex justify-between"><span className="text-ink-600">支撑方式</span>
                      <select value={p.support_type}
                        onChange={e => store.updatePlaced(p.id, { support_type: e.target.value as StoneSupportType })}
                        className="px-2 py-0.5 rounded bg-white border border-ink-200 text-xs">
                        {SUPPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-ink-600 text-xs mb-1 block">位置 X/Y/Z (cm)</label>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="number" className="ink-input text-xs" value={p.pos_x}
                          onChange={e => store.updatePlaced(p.id, { pos_x: +e.target.value })} />
                        <input type="number" className="ink-input text-xs" value={p.pos_y}
                          onChange={e => store.updatePlaced(p.id, { pos_y: +e.target.value })} />
                        <input type="number" className="ink-input text-xs" value={p.pos_z}
                          onChange={e => store.updatePlaced(p.id, { pos_z: +e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={p.has_tie}
                          onChange={e => store.updatePlaced(p.id, { has_tie: e.target.checked })} />
                        设拉结
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={p.has_grout}
                          onChange={e => store.updatePlaced(p.id, { has_grout: e.target.checked })} />
                        灌浆缝
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 新增层弹窗 */}
        {showAddLayer && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-ink-50 w-full max-w-lg rounded-3xl shadow-2xl border border-ink-200 overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between bg-gradient-to-r from-ochre-500 to-stoneblue-600">
                <h3 className="font-bold font-song text-xl text-white flex items-center gap-2">
                  <Layers className="w-5 h-5" />新增堆叠层
                </h3>
                <button onClick={() => setShowAddLayer(false)} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-semibold text-ink-700 block mb-2">层类型 *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {LAYER_TYPES.map(lt => (
                      <button key={lt.type} onClick={() => setNewLayerType(lt.type)}
                        className={`p-3 rounded-xl text-sm font-bold transition-all border-2 ${
                          newLayerType === lt.type
                            ? `bg-gradient-to-br ${lt.color} text-white border-transparent shadow-md scale-105`
                            : 'bg-white border-ink-200 text-ink-700 hover:border-ink-300'
                        }`}>
                        <div className="w-8 h-8 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-1">{lt.icon}</div>
                        {lt.type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-ink-700 block mb-1.5">层名称</label>
                    <input
                      value={newLayerName}
                      onChange={e => setNewLayerName(e.target.value)}
                      placeholder={`例：${newLayerType}-${layers.length + 1}`}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink-200 focus:border-stoneblue-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-ink-700 block mb-1.5">基准高度Z (cm)</label>
                    <input
                      type="number" min={0} step={5}
                      value={newLayerBaseZ}
                      onChange={e => setNewLayerBaseZ(Math.max(0, +e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink-200 focus:border-stoneblue-500 focus:outline-none transition font-mono"
                    />
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-pine-50 to-stoneblue-50 rounded-xl border border-ink-200 text-xs text-ink-600 space-y-1">
                  <p>📌 <b className="text-ink-700">层布置规则</b>：</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>基础层 (Z=0)：放置大吨位压脚石，奠定重心</li>
                    <li>主山层：竖放主峰、横放峭壁等高差大的主体石</li>
                    <li>中层：洞壑、蹬道、挑石、悬石、点缀配石</li>
                    <li>顶峦层：收顶小品，重量宜轻，避免头重脚轻</li>
                  </ul>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-ink-200 bg-ink-100/50 flex gap-3 justify-end">
                <button onClick={() => setShowAddLayer(false)}
                  className="px-5 py-2.5 rounded-xl bg-white border border-ink-200 text-ink-700 font-semibold hover:bg-ink-50 transition">
                  取消
                </button>
                <button onClick={submitAddLayer}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-stoneblue-600 to-ink-700 text-white font-bold shadow hover:shadow-lg transition flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />确认新增
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
