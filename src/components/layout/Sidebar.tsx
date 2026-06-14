import { NavLink } from 'react-router-dom';
import {
  Mountain,
  Scale,
  Activity,
  Hammer,
  BookOpen,
  Gem,
} from 'lucide-react';
import ProjectSwitcher from '@/components/ProjectSwitcher';

const navItems = [
  { path: '/stones', label: '叠石录入', icon: Mountain, desc: '湖石档案' },
  { path: '/center-of-gravity', label: '重心校核', icon: Scale, desc: '稳定判定' },
  { path: '/stress-analysis', label: '受力诊断', icon: Activity, desc: '力学分析' },
  { path: '/construction', label: '施工堆叠', icon: Hammer, desc: '就位顺序' },
  { path: '/paradigm', label: '范式库', icon: BookOpen, desc: '经典传承' },
];

export default function Sidebar() {
  return (
    <aside className="w-[220px] min-h-screen bg-ink-900 text-ink-100 flex flex-col shadow-2xl relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(74,124,155,0.4) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(160,82,45,0.3) 0%, transparent 40%)',
        }}
      />
      <div className="relative px-5 py-6 border-b border-ink-700/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-stoneblue-500 to-ochre-500 flex items-center justify-center shadow-lg">
            <Gem className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-song text-lg font-bold text-ink-50 tracking-wider">
              叠山营造
            </h1>
            <p className="text-[10px] text-ink-400 mt-0.5 tracking-[0.2em]">
              STABILITY · ANALYSIS
            </p>
          </div>
        </div>
        <div className="mt-4 h-1 bg-gradient-to-r from-ochre-500/60 via-stoneblue-500/40 to-transparent rounded" />

        <div className="mt-4">
          <ProjectSwitcher />
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 relative overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] tracking-[0.3em] text-ink-500 uppercase font-medium">
          功能典籍
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-stoneblue-600/80 to-stoneblue-500/40 text-white shadow-lg shadow-stoneblue-900/40'
                  : 'text-ink-300 hover:bg-ink-800/60 hover:text-ink-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-ochre-400 rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-song text-sm font-medium">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-stoneblue-100/80' : 'text-ink-500 group-hover:text-ink-400'}`}>
                    {item.desc}
                  </div>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="relative p-4 border-t border-ink-700/60 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-pine-400 animate-pulse" />
          <span className="text-[11px] text-ink-400">计算引擎就绪</span>
        </div>
        <div className="px-2 py-2 rounded-md bg-ink-800/50 border border-ink-700/40">
          <p className="text-[10px] text-ink-500 leading-relaxed">
            造园有法，式无定式。<br/>
            一石三居，下重上轻。
          </p>
        </div>
      </div>
    </aside>
  );
}
