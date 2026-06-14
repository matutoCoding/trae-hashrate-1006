import { Bell, Search, Settings, Download, Plus } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-16 bg-ink-50/80 backdrop-blur-sm border-b border-ink-200/70 flex items-center px-6 gap-4 sticky top-0 z-40">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="font-song text-xl font-bold text-ink-900 tracking-wide">
            {title}
          </h2>
          <div className="h-5 w-px bg-ink-300" />
          {subtitle && (
            <span className="text-sm text-ink-600 font-song">{subtitle}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="搜索湖石/方案..."
            className="pl-9 pr-4 py-1.5 w-56 rounded-md bg-white/70 border border-ink-200 text-sm
                       focus:outline-none focus:border-stoneblue-500 focus:ring-2 focus:ring-stoneblue-500/20
                       transition-all placeholder:text-ink-400"
          />
        </div>

        {actions}

        <button className="p-2 rounded-md text-ink-600 hover:bg-ink-100 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cinnabar-500" />
        </button>
        <button className="p-2 rounded-md text-ink-600 hover:bg-ink-100 transition-colors">
          <Download className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-md text-ink-600 hover:bg-ink-100 transition-colors">
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-px h-8 bg-ink-200 mx-1" />

        <div className="flex items-center gap-2 pl-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ochre-400 to-cinnabar-500 flex items-center justify-center text-white font-song text-sm font-bold shadow-md">
            叠
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-medium text-ink-800 font-song">山匠</p>
            <p className="text-[10px] text-ink-500">叠山技师</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ActionButton({
  icon: Icon,
  children,
  variant = 'primary',
  onClick,
}: {
  icon?: any;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'secondary';
  onClick?: () => void;
}) {
  const styles = {
    primary: 'stoneblue-btn flex items-center gap-2 text-sm py-1.5 px-3',
    ghost: 'ghost-btn flex items-center gap-2 text-sm py-1.5 px-3',
    secondary: 'bg-ink-700 hover:bg-ink-600 text-white rounded-md flex items-center gap-2 text-sm py-1.5 px-3 transition-all',
  };
  return (
    <button className={styles[variant]} onClick={onClick}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export { Plus };
