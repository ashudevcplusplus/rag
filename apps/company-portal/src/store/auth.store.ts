import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Company } from '@rag/types';

interface AuthState {
  // Auth state
  user: User | null;
  company: Company | null;
  token: string | null; // JWT token for authenticated requests
  companyId: string | null;
  apiUrl: string;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (data: { user: User; company: Company; token: string }) => void;
  logout: () => void;
  setApiUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  updateUser: (user: Partial<User>) => void;
  updateCompany: (company: Partial<Company>) => void;
}

const DEFAULT_API_URL = 'http://localhost:8000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      company: null,
      token: null,
      companyId: null,
      apiUrl: DEFAULT_API_URL,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: ({ user, company, token }) => {
        set({
          user,
          company,
          token,
          companyId: company._id,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          company: null,
          token: null,
          companyId: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setApiUrl: (url) => {
        set({ apiUrl: url });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      updateCompany: (companyData) => {
        set((state) => ({
          company: state.company ? { ...state.company, ...companyData } : null,
        }));
      },
    }),
    {
      name: 'rag-auth-storage',
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        token: state.token,
        companyId: state.companyId,
        apiUrl: state.apiUrl,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
