import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell, Legend, Line
} from "recharts";
import { 
  LogOut, UploadCloud, Settings2, FileSpreadsheet, Download, FileText, LayoutDashboard,
  Users, Trophy, Table as TableIcon, ActivitySquare, ShieldAlert
} from "lucide-react";
import { useGetMe, useLogout, useUploadFile, useExportExcel, useExportMarkdown, useExportPdf } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDecimals, getGradeColor, getHeatmapColor } from "@/lib/utils";

// --- Sub Components ---
import { ExecutiveSummary } from "./dashboard-tabs/executive-summary";
import { SubjectPerformance } from "./dashboard-tabs/subject-performance";
import { StudentAnalysis } from "./dashboard-tabs/student-analysis";
import { TopPerformers } from "./dashboard-tabs/top-performers";
import { DataPreview } from "./dashboard-tabs/data-preview";
import { AdvancedCharts } from "./dashboard-tabs/advanced-charts";
import { Reports } from "./dashboard-tabs/reports";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isAuthLoading, isError: authError } = useGetMe({
    query: { retry: false }
  });
  
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => setLocation("/login")
    }
  });

  const { passPercentage, setPassPercentage, decimals, setDecimals, showStudentIds, setShowStudentIds, analysisData, setAnalysisData } = useAppStore();
  
  const uploadMutation = useUploadFile();
  const [activeTab, setActiveTab] = useState("executive");

  useEffect(() => {
    if (authError || (user && !user.authenticated)) {
      setLocation("/login");
    }
  }, [user, authError, setLocation]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate({ data: { file: acceptedFiles[0], passPercentage } }, {
        onSuccess: (res) => {
          setAnalysisData(res);
        }
      });
    }
  }, [passPercentage, uploadMutation, setAnalysisData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-primary">
          <ActivitySquare className="w-12 h-12 animate-pulse" />
          <p className="font-medium animate-pulse text-lg">Loading environment...</p>
        </div>
      </div>
    );
  }

  if (!user?.authenticated) return null;

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-screen shrink-0">
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30">
            <ActivitySquare className="w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight">ExamAnalyzer</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Data Source</h3>
            
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-sidebar-border hover:border-primary/50 hover:bg-sidebar-accent'}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-secondary rounded-full group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm font-medium mb-1">
                {uploadMutation.isPending ? "Analyzing..." : "Drop Excel file here"}
              </p>
              <p className="text-xs text-muted-foreground">or click to browse (.xlsx, .xls)</p>
            </div>
            {analysisData && (
              <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2 text-sm">
                <ShieldAlert className="w-4 h-4" /> Data Loaded
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Parameters
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <label className="font-medium">Pass Percentage</label>
                <span className="text-primary font-bold">{passPercentage}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={passPercentage}
                onChange={(e) => setPassPercentage(parseInt(e.target.value))}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium block">Decimal Places</label>
              <div className="flex gap-2">
                {[0, 1, 2].map(d => (
                  <button
                    key={d}
                    onClick={() => setDecimals(d)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${decimals === d ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-sm font-medium cursor-pointer" htmlFor="showIds">Show Student IDs</label>
              <button 
                id="showIds"
                onClick={() => setShowStudentIds(!showStudentIds)}
                className={`w-11 h-6 rounded-full transition-colors relative ${showStudentIds ? 'bg-primary' : 'bg-secondary'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showStudentIds ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="font-medium text-sidebar-foreground">{user.username}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => logoutMutation.mutate()}
              title="Logout"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative h-screen">
        {uploadMutation.isPending && (
          <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center">
            <ActivitySquare className="w-16 h-16 text-primary animate-pulse mb-4" />
            <h2 className="text-2xl font-bold">Analyzing Data...</h2>
            <p className="text-muted-foreground mt-2">Crunching numbers and generating insights</p>
          </div>
        )}

        {!analysisData && !uploadMutation.isPending ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-3">No Data Loaded</h2>
            <p className="text-muted-foreground max-w-md text-lg">
              Drag and drop an Excel file containing student examination marks into the sidebar to begin analysis.
            </p>
          </div>
        ) : analysisData && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-8 sticky top-0 z-10 bg-background/80 backdrop-blur-xl pb-4 border-b border-border">
                <div>
                  <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">Analysis Results</h2>
                  <p className="text-muted-foreground mt-1">Based on {analysisData.analysis?.totalStudents} students and {analysisData.analysis?.totalSubjects} subjects.</p>
                </div>
                
                <TabsList className="bg-secondary/60">
                  <TabsTrigger value="executive"><LayoutDashboard className="w-4 h-4 mr-2"/> Executive</TabsTrigger>
                  <TabsTrigger value="subjects"><ActivitySquare className="w-4 h-4 mr-2"/> Subjects</TabsTrigger>
                  <TabsTrigger value="students"><Users className="w-4 h-4 mr-2"/> Students</TabsTrigger>
                  <TabsTrigger value="top"><Trophy className="w-4 h-4 mr-2"/> Top Performers</TabsTrigger>
                  <TabsTrigger value="data"><TableIcon className="w-4 h-4 mr-2"/> Raw Data</TabsTrigger>
                  <TabsTrigger value="advanced"><ActivitySquare className="w-4 h-4 mr-2"/> Advanced</TabsTrigger>
                  <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-2"/> Reports</TabsTrigger>
                </TabsList>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TabsContent value="executive">
                  <ExecutiveSummary data={analysisData} />
                </TabsContent>
                <TabsContent value="subjects">
                  <SubjectPerformance data={analysisData} />
                </TabsContent>
                <TabsContent value="students">
                  <StudentAnalysis data={analysisData} />
                </TabsContent>
                <TabsContent value="top">
                  <TopPerformers data={analysisData} />
                </TabsContent>
                <TabsContent value="data">
                  <DataPreview data={analysisData} />
                </TabsContent>
                <TabsContent value="advanced">
                  <AdvancedCharts data={analysisData} />
                </TabsContent>
                <TabsContent value="reports">
                  <Reports data={analysisData} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
