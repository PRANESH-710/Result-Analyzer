import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AnalysisResponse } from '@workspace/api-client-react';

const MAX_HISTORY_ITEMS = 10;

function createHistoryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface AnalysisHistoryItem {
  id: string;
  name: string;
  createdAt: string;
  analysisData: AnalysisResponse;
  passPercentage: number;
  subjectPassPercentages: Record<string, number>;
}

interface AppState {
  passPercentage: number;
  setPassPercentage: (v: number) => void;
  subjectPassPercentages: Record<string, number>;
  setSubjectPassPercentages: (value: Record<string, number>) => void;
  decimals: number;
  setDecimals: (v: number) => void;
  showStudentIds: boolean;
  setShowStudentIds: (v: boolean) => void;
  analysisData: AnalysisResponse | null;
  setAnalysisData: (data: AnalysisResponse | null) => void;
  analysisHistory: AnalysisHistoryItem[];
  activeHistoryId: string | null;
  addAnalysisToHistory: (entry: {
    name: string;
    analysisData: AnalysisResponse;
    passPercentage: number;
    subjectPassPercentages: Record<string, number>;
  }) => void;
  updateActiveHistory: (entry: {
    analysisData: AnalysisResponse;
    passPercentage: number;
    subjectPassPercentages: Record<string, number>;
  }) => void;
  loadAnalysisFromHistory: (id: string) => AnalysisHistoryItem | null;
  removeAnalysisFromHistory: (id: string) => void;
  clearAnalysisHistory: () => void;
  clearAnalysis: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      passPercentage: 40,
      setPassPercentage: (v) => set({ passPercentage: v }),
      subjectPassPercentages: {},
      setSubjectPassPercentages: (value) => set({ subjectPassPercentages: value }),
      decimals: 2,
      setDecimals: (v) => set({ decimals: v }),
      showStudentIds: true,
      setShowStudentIds: (v) => set({ showStudentIds: v }),
      analysisData: null,
      setAnalysisData: (data) => set({ analysisData: data }),
      analysisHistory: [],
      activeHistoryId: null,
      addAnalysisToHistory: ({ name, analysisData, passPercentage, subjectPassPercentages }) =>
        set((state) => {
          const id = createHistoryId();

          return {
            activeHistoryId: id,
            analysisHistory: [
              {
                id,
                name,
                createdAt: new Date().toISOString(),
                analysisData,
                passPercentage,
                subjectPassPercentages,
              },
              ...state.analysisHistory,
            ].slice(0, MAX_HISTORY_ITEMS),
          };
        }),
      updateActiveHistory: ({ analysisData, passPercentage, subjectPassPercentages }) =>
        set((state) => {
          if (!state.activeHistoryId) {
            return state;
          }

          return {
            analysisHistory: state.analysisHistory.map((entry) =>
              entry.id === state.activeHistoryId
                ? {
                    ...entry,
                    analysisData,
                    passPercentage,
                    subjectPassPercentages,
                  }
                : entry,
            ),
          };
        }),
      loadAnalysisFromHistory: (id) => {
        const item = get().analysisHistory.find((entry) => entry.id === id);

        if (!item) {
          return null;
        }

        set({
          activeHistoryId: id,
          analysisData: item.analysisData,
          passPercentage: item.passPercentage,
          subjectPassPercentages: item.subjectPassPercentages,
        });

        return item;
      },
      removeAnalysisFromHistory: (id) =>
        set((state) => ({
          activeHistoryId: state.activeHistoryId === id ? null : state.activeHistoryId,
          analysisHistory: state.analysisHistory.filter((entry) => entry.id !== id),
        })),
      clearAnalysisHistory: () => set({ analysisHistory: [], activeHistoryId: null }),
      clearAnalysis: () => set({ analysisData: null, subjectPassPercentages: {} }),
    }),
    {
      name: 'exam-analyzer-result-history-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        analysisHistory: state.analysisHistory,
      }),
    },
  ),
);
