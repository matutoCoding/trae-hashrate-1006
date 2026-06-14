import { X, Layers, Mountain, CheckCircle2, Import, Info } from 'lucide-react';
import type { Paradigm } from '@/types/paradigm';

interface Props {
  open: boolean;
  onClose: () => void;
  paradigm: Paradigm | null;
  onLoad: () => void;
}

export default function ParadigmPreviewModal({ open, onClose, paradigm, onLoad }: Props) {
  if (!open || !paradigm) return null;

  const totalStones = paradigm.layers.reduce((s, l) => s + l.stones.length, 0);
  const rolesCount: Record<string, number> = {};
  for (const l of paradigm.layers) {
    for (const st of l.stones) {
      rolesCount[st.role] = (rolesCount[st.role] ?? 0) + 1;
    }
  }

  const maxH = paradigm.height_m * 100;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-[860px] max-w-full h-[82vh] bg-ink-50 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-ink-200">
        <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between bg-gradient-to-r from-stoneblue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stoneblue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-song text-lg font-bold text-ink-900">范式载入预览</h3>
              <p className="text-xs text-ink-500 mt-0.5">
                {paradigm.name} · {paradigm.style} · {paradigm.garden}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          <div className="grid grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-stoneblue-50 to-white border border-stoneblue-100 text-center">
              <Layers className="w-5 h-5 mx-auto text-stoneblue-600 mb-1" />
              <p className="text-2xl font-bold font-song text-ink-800">{paradigm.layers.length}</p>
              <p className="text-xs text-ink-500">分层</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-pine-50 to-white border border-pine-100 text-center">
              <Mountain className="w-5 h-5 mx-auto text-pine-600 mb-1" />
              <p className="text-2xl font-bold font-song text-ink-800">{totalStones}</p>
              <p className="text-xs text-ink-500">石位</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-ochre-50 to-white border border-ochre-100 text-center">
              <p className="text-xs text-ochre-600 font-semibold">高度</p>
              <p className="text-2xl font-bold font-song text-ink-800 mt-1">{paradigm.height_m}m</p>
              <p className="text-xs text-ink-500">总高</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-cinnabar-50 to-white border border-cinnabar-100 text-center">
              <p className="text-xs text-cinnabar-600 font-semibold">基底</p>
              <p className="text-lg font-bold font-song text-ink-800 mt-1">
                {paradigm.base_dimensions.length_cm}×{paradigm.base_dimensions.width_cm}
              </p>
              <p className="text-xs text-ink-500">cm</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-ink-50 to-white border border-ink-200 text-center">
              <p className="text-xs text-ink-600 font-semibold">预估</p>
              <p className="text-2xl font-bold font-song text-ink-800 mt-1">{paradigm.estimated_weight_ton}t</p>
              <p className="text-xs text-ink-500">总重</p>
            </div>
          </div>

          {Object.keys(rolesCount).length > 0 && (
            <div className="p-4 rounded-xl bg-white border border-ink-200">
              <p className="text-sm font-bold text-ink-700 mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-stoneblue-600" /> 角色分布
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(rolesCount).map(([role, n]) => (
                  <span key={role} className="px-3 py-1.5 rounded-full bg-ink-100 text-ink-700 text-xs font-semibold">
                    {role} × {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 骨架剖面图 */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-white to-ink-50 border border-ink-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-ink-800 flex items-center gap-1.5">
                <Mountain className="w-4 h-4 text-ochre-600" /> 骨架剖面预览
              </p>
              <p className="text-xs text-ink-500">单位：cm</p>
            </div>
            <svg viewBox="0 0 700 380" className="w-full rounded-xl border border-ink-100 bg-gradient-to-b from-ink-50 to-white">
              <defs>
                <pattern id="preview-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d6d3d1" strokeWidth="0.4" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="700" height="380" fill="url(#preview-grid)" />

              {/* 基座 */}
              <rect x="30" y="340" width="640" height="20" rx="2" fill="#7c4a1e" opacity="0.8" />
              <text x="350" y="368" textAnchor="middle" fontSize="11" fill="#57534e" fontFamily="serif">
                基础座 {paradigm.base_dimensions.length_cm}×{paradigm.base_dimensions.width_cm}cm
              </text>

              {/* 高度刻度 */}
              {[0, 1, 2, 3, 4].map(i => {
                const hScale = 300 / Math.max(400, maxH);
                const hVal = Math.round((i * 75) / hScale);
                return (
                  <g key={i}>
                    <line x1="20" y1={340 - i * 75} x2="30" y2={340 - i * 75} stroke="#78716c" strokeWidth="1" />
                    <text x="17" y={343 - i * 75} textAnchor="end" fontSize="9" fill="#78716c">{hVal}</text>
                  </g>
                );
              })}

              {/* 各层分隔线与标签 */}
              {paradigm.layers.map((layer, li) => {
                const hScale = 300 / Math.max(400, maxH);
                const baseY = 340 - layer.height_ratio * 300 * li * 0.6;
                const layerTopY = 340 - layer.height_ratio * 300 * (li + 1) * 0.6;
                const pal = ['#8b7355', '#5c6b7a', '#7a5c3e', '#a0522d', '#4a9b83', '#6b5b7a'];
                const colors: Record<string, string> = {
                  '基础层': '#7c4a1e', '压脚': '#7c4a1e',
                  '主山层': '#5c6b7a', '主峰': '#5c6b7a',
                  '中层': '#8b7355', '配石': '#8b7355',
                  '顶峦层': '#6b5b7a', '收顶': '#6b5b7a',
                };
                return (
                  <g key={li}>
                    <line
                      x1="30" x2="670" y1={baseY} y2={baseY}
                      stroke="#a8a29e" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6"
                    />
                    <text x="40" y={baseY - 4} fontSize="10" fill="#78716c" fontFamily="serif">
                      {layer.name}
                    </text>
                    {layer.stones.map((st, si) => {
                      const cx = 80 + st.relative_position.x * 540;
                      const w = 28 + st.relative_weight_ratio * 22;
                      const h = 20 + st.relative_weight_ratio * 26;
                      const botY = baseY - st.relative_position.z * 240;
                      const y = botY - h;
                      const fill = colors[st.role] ?? pal[(li + si) % pal.length];
                      const roleColor: Record<string, string> = {
                        '挑石': '#c2410c', '悬石': '#7c3aed', '压脚': '#78350f',
                        '主峰': '#1e3a8a', '主山': '#1e3a8a', '配石': '#166534',
                      };
                      return (
                        <g key={si}>
                          <ellipse
                            cx={cx} cy={y + h / 2} rx={w / 2} ry={h / 2}
                            fill={fill} opacity="0.9"
                            stroke={roleColor[st.role] ?? '#44403c'}
                            strokeWidth={st.role === '挑石' || st.role === '悬石' ? 2 : 1}
                          />
                          <path
                            d={`M${cx - w / 2 + 4},${y + h * 0.3} Q${cx - w / 3},${y + 4} ${cx},${y + h * 0.2}`}
                            fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"
                          />
                          <text x={cx} y={y + h / 2 + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                            {st.role.slice(0, 1)}
                          </text>
                          <text x={cx} y={y - 3} textAnchor="middle" fontSize="8" fill="#57534e">
                            {st.stone_code}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 层级详细列表 */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cinnabar-600" /> 层级与石位清单
            </p>
            {paradigm.layers.map((layer, li) => (
              <div key={li} className="p-3 rounded-xl bg-white border border-ink-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-ink-700 to-ink-900 text-white text-xs font-bold flex items-center justify-center">
                      {li + 1}
                    </span>
                    <span className="font-bold text-ink-800">{layer.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">
                      {layer.layer_type}
                    </span>
                    <span className="text-xs text-ink-500">占比 {(layer.height_ratio * 100).toFixed(0)}%</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stoneblue-100 text-stoneblue-700 font-bold">
                    {layer.stones.length} 块
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {layer.stones.map((st, si) => (
                    <div key={si} className="flex items-center gap-2 text-xs p-2 bg-ink-50 rounded border border-ink-100">
                      <span className="w-6 h-6 rounded bg-stoneblue-100 text-stoneblue-700 font-bold flex items-center justify-center text-[10px]">
                        {si + 1}
                      </span>
                      <span className="font-mono text-ink-700 w-24">{st.stone_code}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        st.role === '挑石' ? 'bg-cinnabar-100 text-cinnabar-700' :
                        st.role === '悬石' ? 'bg-purple-100 text-purple-700' :
                        st.role === '压脚' ? 'bg-amber-100 text-amber-700' :
                        st.role === '主山' || st.role === '副山' ? 'bg-stoneblue-100 text-stoneblue-700' :
                        'bg-pine-100 text-pine-700'
                      }`}>
                        {st.role}
                      </span>
                      <span className="text-ink-600">支撑：[{st.support_type}]</span>
                      <span className="ml-auto text-ink-500 font-mono">
                        ({st.relative_position.x.toFixed(2)}, {st.relative_position.y.toFixed(2)}, {st.relative_position.z.toFixed(2)}) × {st.relative_weight_ratio.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ink-200 bg-white flex items-center justify-between">
          <p className="text-xs text-ink-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            载入后将清空当前堆叠方案，自动创建相应层与石位
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="ghost-btn text-sm py-2 px-4">
              取消
            </button>
            <button
              onClick={onLoad}
              className="stoneblue-btn text-sm py-2 px-5 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> 确认载入此范式
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
