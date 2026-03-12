import { create } from 'zustand';
import type { AnalysisResponse } from '@workspace/api-client-react';

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
  clearAnalysis: () => void;
}

export const useAppStore = create<AppState>((set) => ({
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
  clearAnalysis: () => set({ analysisData: null, subjectPassPercentages: {} })
}));
