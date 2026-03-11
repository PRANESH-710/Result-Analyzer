import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/use-app-store";
import { formatDecimals } from "@/lib/utils";
import { Trophy, Medal, Award } from "lucide-react";

export function TopPerformers({ data }: { data: any }) {
  const { decimals, showStudentIds } = useAppStore();
  const top10 = data.analysis.topStudents || [];
  const subjectStats = data.analysis.subjectWiseStats;

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-slate-300" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Overall Top 10 Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {top10.map((student: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center ring-1 ring-border shadow-inner">
                    {getRankIcon(i)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {showStudentIds ? student.name : `Student ${i+1}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-display text-primary">{formatDecimals(student.average, decimals)}%</p>
                  <p className="text-xs text-muted-foreground">Average Score</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject Toppers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(subjectStats).map(([subject, stats]: any, i: number) => (
              <div key={i} className="flex flex-col p-4 rounded-xl bg-secondary/30 border border-border">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{subject}</span>
                  <span className="text-lg font-bold text-accent">{formatDecimals(stats.topper.score, decimals)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-accent" />
                  <span className="font-medium">
                    {showStudentIds ? stats.topper.name : "Top Student"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
