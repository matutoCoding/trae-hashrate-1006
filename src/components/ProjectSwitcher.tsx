import { useState } from 'react';
import { ChevronDown, FolderKanban, Plus, Copy, Edit3, Archive, Trash2, Check, X, FolderOpen } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import type { Project } from '@/types/project';
import { useStackStore } from '@/store/stackStore';
import { useStoneStore } from '@/store/stoneStore';

export default function ProjectSwitcher() {
  const projectStore = useProjectStore();
  const stackStore = useStackStore();
  const stoneStore = useStoneStore();
  const [open, setOpen] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);

  const current = projectStore.ensureDefaultProject();
  const all = projectStore.projects;

  const switchTo = (p: Project) => {
    projectStore.switchProject(p.id);
    stoneStore.ensureStonesForProject(p.id);
    stackStore.ensureSchemeForProject(p.id, p.base_dimensions.length_cm, p.base_dimensions.width_cm);
    setOpen(false);
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditingName(p.name);
  };
  const saveEdit = () => {
    if (editingId && editingName.trim()) projectStore.renameProject(editingId, editingName.trim());
    setEditingId(null);
  };

  const doCreate = () => {
    if (!newName.trim()) return;
    projectStore.createProject({ name: newName.trim(), status: 'active' });
    setNewName('');
    setShowNew(false);
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/50 transition-all group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderKanban className="w-4 h-4 text-ochre-400 flex-shrink-0" />
          <div className="min-w-0 text-left">
            <p className="text-[11px] tracking-wider text-ink-400">当前方案</p>
            <p className="font-song text-sm font-medium text-ink-50 truncate">{current.name}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowManage(false); }} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 w-[280px] rounded-lg bg-ink-800 border border-ink-700 shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-ink-700/60 max-h-56 overflow-y-auto">
              {all.map((p) => (
                <div key={p.id} className="group">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        className="flex-1 min-w-0 px-2 py-1 rounded bg-ink-900/60 border border-stoneblue-500/50 text-sm text-ink-50 outline-none"
                      />
                      <button onClick={saveEdit} className="p-1 text-pine-400 hover:bg-ink-700 rounded"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-ink-400 hover:bg-ink-700 rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div
                      onClick={() => switchTo(p)}
                      className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                        p.id === current.id ? 'bg-stoneblue-700/40 text-white' : 'hover:bg-ink-700/60 text-ink-200'
                      }`}
                    >
                      {p.id === current.id && <div className="w-1.5 h-1.5 rounded-full bg-ochre-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-song text-sm truncate">
                          {p.name}
                          {p.status === 'archived' && <span className="ml-1 text-[9px] text-ink-500">[已归档]</span>}
                          {p.status === 'draft' && <span className="ml-1 text-[9px] text-ochre-300">[草稿]</span>}
                        </p>
                        <p className="text-[10px] text-ink-500 truncate">{p.code} · {p.client ?? '未命名业主'}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                          className="p-1 text-ink-400 hover:text-stoneblue-300 rounded"
                          title="重命名"
                        ><Edit3 className="w-3 h-3" /></button>
                        <button
                          onClick={(e) => { e.stopPropagation(); projectStore.duplicateProject(p.id); }}
                          className="p-1 text-ink-400 hover:text-stoneblue-300 rounded"
                          title="复制方案"
                        ><Copy className="w-3 h-3" /></button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.status === 'archived') projectStore.unarchiveProject(p.id);
                            else projectStore.archiveProject(p.id);
                          }}
                          className="p-1 text-ink-400 hover:text-stoneblue-300 rounded"
                          title={p.status === 'archived' ? '取消归档' : '归档'}
                        ><Archive className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-2 space-y-1">
              {!showNew ? (
                <button
                  onClick={() => setShowNew(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-ink-200 hover:bg-ink-700/50 rounded transition-colors"
                >
                  <Plus className="w-4 h-4 text-stoneblue-400" />
                  新建方案
                </button>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doCreate()}
                    placeholder="方案名称..."
                    className="flex-1 min-w-0 px-2 py-1 rounded bg-ink-900/60 border border-stoneblue-500/40 text-sm text-ink-50 outline-none placeholder:text-ink-500"
                  />
                  <button onClick={doCreate} className="p-1 text-pine-400 hover:bg-ink-700 rounded"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setShowNew(false); setNewName(''); }} className="p-1 text-ink-400 hover:bg-ink-700 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <button
                onClick={() => { setOpen(false); setShowManage(true); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-ink-200 hover:bg-ink-700/50 rounded transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-ochre-400" />
                方案管理
              </button>
            </div>
          </div>
        </>
      )}

      {showManage && <ManageModal onClose={() => setShowManage(false)} />}
    </div>
  );
}

function ManageModal({ onClose }: { onClose: () => void }) {
  const projectStore = useProjectStore();
  const [tab, setTab] = useState<'all' | 'active' | 'archived'>('all');
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newLoc, setNewLoc] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const list =
    tab === 'all'
      ? projectStore.projects
      : projectStore.projects.filter((p) => p.status === tab);
  const sorted = [...list].sort((a, b) => b.updated_at - a.updated_at);

  const doCreate = () => {
    if (!newName.trim()) return;
    projectStore.createProject({
      name: newName.trim(),
      client: newClient.trim() || undefined,
      location: newLoc.trim() || undefined,
      description: newDesc.trim() || undefined,
      status: 'active',
    });
    setNewName('');
    setNewClient('');
    setNewLoc('');
    setNewDesc('');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[720px] max-h-[85vh] bg-ink-50 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-ink-200">
        <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between bg-gradient-to-r from-ink-100 to-white">
          <div>
            <h3 className="font-song text-lg font-bold text-ink-900">方案管理</h3>
            <p className="text-xs text-ink-500 mt-0.5">所有假山方案的新建、复制、归档、删除</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-ink-200 flex items-center gap-2">
          {(['all', 'active', 'archived'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                tab === t ? 'bg-stoneblue-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              {t === 'all' ? '全部' : t === 'active' ? '进行中' : '已归档'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="p-4 rounded-lg border border-ink-200 bg-white">
            <p className="font-song font-semibold text-ink-800 mb-3">新建方案</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="方案名称 *"
                className="px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
              />
              <input
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="业主单位 / 委托方"
                className="px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
              />
              <input
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                placeholder="项目地点"
                className="px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="方案描述"
                className="px-3 py-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-stoneblue-500"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={doCreate}
                className="stoneblue-btn text-sm py-1.5 px-4 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> 创建方案
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {sorted.length === 0 && (
              <div className="p-8 text-center text-ink-400 text-sm rounded-lg border border-dashed border-ink-300">
                暂无方案
              </div>
            )}
            {sorted.map((p) => (
              <div key={p.id} className="p-4 rounded-lg border border-ink-200 bg-white hover:border-stoneblue-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-stoneblue-500 to-ochre-400 flex items-center justify-center text-white font-song font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-song font-semibold text-ink-900">{p.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">{p.code}</span>
                      {p.status === 'archived' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-200 text-ink-600">已归档</span>}
                      {p.status === 'draft' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-ochre-100 text-ochre-700">草稿</span>}
                      {p.status === 'active' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-pine-100 text-pine-700">进行中</span>}
                    </div>
                    <p className="text-xs text-ink-500 mt-1">
                      {p.client && `${p.client} · `}
                      {p.location && `${p.location} · `}
                      尺寸 {p.base_dimensions.length_cm}×{p.base_dimensions.width_cm}cm
                    </p>
                    {p.description && <p className="text-xs text-ink-400 mt-1 line-clamp-1">{p.description}</p>}
                    <p className="text-[10px] text-ink-400 mt-1">
                      更新于 {new Date(p.updated_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { projectStore.switchProject(p.id); onClose(); }}
                      className="ghost-btn text-xs py-1 px-2.5"
                    >切换</button>
                    <button
                      onClick={() => projectStore.duplicateProject(p.id)}
                      className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100 hover:text-stoneblue-600"
                      title="复制"
                    ><Copy className="w-4 h-4" /></button>
                    <button
                      onClick={() => {
                        if (p.status === 'archived') projectStore.unarchiveProject(p.id);
                        else projectStore.archiveProject(p.id);
                      }}
                      className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100 hover:text-ochre-600"
                      title={p.status === 'archived' ? '取消归档' : '归档'}
                    ><Archive className="w-4 h-4" /></button>
                    <button
                      onClick={() => {
                        if (confirm(`确认删除「${p.name}」？此操作不可恢复。`)) projectStore.deleteProject(p.id);
                      }}
                      className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100 hover:text-cinnabar-600"
                      title="删除"
                    ><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-ink-200 flex justify-end">
          <button onClick={onClose} className="ghost-btn text-sm py-1.5 px-4">关闭</button>
        </div>
      </div>
    </div>
  );
}
