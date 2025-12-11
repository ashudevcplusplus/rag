import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Activity } from '@rag/types';

interface AppState {
  // UI State
  sidebarOpen: boolean;
  searchCount: number;
  recentActivities: Activity[];

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  incrementSearchCount: () => void;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;
}

const MAX_ACTIVITIES = 50;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      searchCount: 0,
      recentActivities: [],

      // Actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      incrementSearchCount: () => {
        set((state) => ({ searchCount: state.searchCount + 1 }));
      },

      addActivity: (activity) => {
        set((state) => ({
          recentActivities: [
            {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              ...activity,
            },
            ...state.recentActivities,
          ].slice(0, MAX_ACTIVITIES),
        }));
      },

      clearActivities: () => {
        set({ recentActivities: [] });
      },
    }),
    {
      name: 'rag-app-storage',
      partialize: (state) => ({
        searchCount: state.searchCount,
        recentActivities: state.recentActivities,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
