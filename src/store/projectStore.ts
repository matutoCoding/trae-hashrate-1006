import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectStatus, ProjectFilter } from '@/types/project';
import { generateID } from '@/utils/geometry';

interface ProjectState {
  projects: Project[];
  currentProjectId: string;
  filter: ProjectFilter;

  ensureDefaultProject: () => Project;

  createProject: (data: Partial<Project> & { name: string }) => Project;
  duplicateProject: (sourceId: string, newName?: string) => Project | null;
  renameProject: (id: string, name: string) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  switchProject: (id: string) => void;
  setFilter: (f: ProjectFilter) => void;

  getCurrentProject: () => Project | null;
  getFilteredProjects: () => Project[];
  getProjectById: (id: string) => Project | undefined;
}

const makeDefaultProject = (): Project => ({
  id: generateID('prj'),
  name: '主山方案·示范',
  code: 'DS-2026-001',
  client: '叠山营造研究室',
  location: '苏州·拙政园片区',
  description: '古典园林湖石假山主山骨架示范工程',
  status: 'active',
  base_dimensions: { length_cm: 600, width_cm: 400 },
  created_at: Date.now(),
  updated_at: Date.now(),
  metadata: {
    tags: ['湖石', '主山', '示范'],
    designer: '戈裕良（传）',
    construction_leader: '现场工头',
  },
});

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: '',
      filter: 'all',

      ensureDefaultProject: () => {
        const { projects, currentProjectId } = get();
        if (projects.length === 0) {
          const dp = makeDefaultProject();
          set({ projects: [dp], currentProjectId: dp.id });
          return dp;
        }
        if (!currentProjectId || !projects.find(p => p.id === currentProjectId)) {
          const firstActive = projects.find(p => p.status === 'active') ?? projects[0];
          set({ currentProjectId: firstActive.id });
          return firstActive;
        }
        return projects.find(p => p.id === currentProjectId)!;
      },

      createProject: (data) => {
        const count = get().projects.length + 1;
        const p: Project = {
          id: generateID('prj'),
          name: data.name,
          code: data.code ?? `DS-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`,
          client: data.client,
          location: data.location,
          description: data.description ?? '',
          status: data.status ?? 'draft',
          base_dimensions: data.base_dimensions ?? { length_cm: 600, width_cm: 400 },
          created_at: Date.now(),
          updated_at: Date.now(),
          metadata: {
            tags: data.metadata?.tags ?? [],
            designer: data.metadata?.designer,
            construction_leader: data.metadata?.construction_leader,
            estimated_completion_date: data.metadata?.estimated_completion_date,
          },
        };
        set((s) => ({
          projects: [...s.projects, p],
          currentProjectId: p.id,
        }));
        return p;
      },

      duplicateProject: (sourceId, newName) => {
        const source = get().projects.find(p => p.id === sourceId);
        if (!source) return null;
        const dup: Project = {
          ...source,
          id: generateID('prj'),
          name: newName ?? `${source.name}（副本）`,
          code: `${source.code}-COPY`,
          status: 'draft',
          created_at: Date.now(),
          updated_at: Date.now(),
          metadata: { ...source.metadata, tags: [...(source.metadata.tags ?? [])] },
        };
        set((s) => ({
          projects: [...s.projects, dup],
          currentProjectId: dup.id,
        }));
        return dup;
      },

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name, updated_at: Date.now() } : p
          ),
        })),

      updateProject: (id, data) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...data,
                  base_dimensions: data.base_dimensions ? { ...p.base_dimensions, ...data.base_dimensions } : p.base_dimensions,
                  metadata: data.metadata ? { ...p.metadata, ...data.metadata } : p.metadata,
                  updated_at: Date.now(),
                }
              : p
          ),
        })),

      archiveProject: (id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, status: 'archived', archived_at: Date.now(), updated_at: Date.now() }
              : p
          ),
        })),

      unarchiveProject: (id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, status: 'active', archived_at: undefined, updated_at: Date.now() }
              : p
          ),
        })),

      deleteProject: (id) => {
        const remain = get().projects.filter((p) => p.id !== id);
        const nextCurrent =
          remain.find((p) => p.id === get().currentProjectId && p.id !== id) ??
          remain.find((p) => p.status === 'active') ??
          remain[0];
        set({
          projects: remain,
          currentProjectId: nextCurrent?.id ?? '',
        });
      },

      switchProject: (id) => set({ currentProjectId: id }),
      setFilter: (f) => set({ filter: f }),

      getCurrentProject: () => {
        const p = get().ensureDefaultProject();
        return get().projects.find(x => x.id === p.id) ?? null;
      },

      getFilteredProjects: () => {
        const { projects, filter } = get();
        if (filter === 'all') return [...projects].sort((a, b) => b.updated_at - a.updated_at);
        return projects
          .filter((p) => p.status === filter)
          .sort((a, b) => b.updated_at - a.updated_at);
      },

      getProjectById: (id) => get().projects.find((p) => p.id === id),
    }),
    { name: 'dieshan-project-store' }
  )
);
