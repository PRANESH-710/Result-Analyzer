import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { useAppStore } from "@/store/use-app-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getHeatmapColor, formatDecimals } from "@/lib/utils";

export function AdvancedCharts({ data }: { data: any }) {
  const { passPercentage, showStudentIds, decimals } = useAppStore();
  const isSmallDataset = data.rawData.length <= 50;

  // Box plot simulation using Min, Max, Avg
  const rangeData = useMemo(() => {
    return Object.entries(data.analysis.subjectWiseStats).map(([subject, stats]: any) => {
      return {
        subject,
        range: [Number(stats.lowestScore), Number(stats.highestScore)],
        average: Number(stats.averageScore),
        min: Number(stats.lowestScore),
        max: Number(stats.highestScore)
      };
    });
  }, [data]);

  const CustomRangeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <p className="text-sm text-muted-foreground">Min: <span className="text-foreground">{formatDecimals(p.min, decimals)}</span></p>
          <p className="text-sm text-primary font-medium">Avg: <span className="text-foreground">{formatDecimals(p.average, decimals)}</span></p>
          <p className="text-sm text-muted-foreground">Max: <span className="text-foreground">{formatDecimals(p.max, decimals)}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Score Ranges by Subject</CardTitle>
          <CardDescription>Visualizing Minimum, Maximum, and Average scores</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rangeData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="subject" angle={-45} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} domain={[0, 100]} />
              <RechartsTooltip content={<CustomRangeTooltip />} cursor={{ fill: 'hsl(var(--secondary)/0.5)' }} />
              <Bar dataKey="range" fill="hsl(var(--primary)/0.3)" stroke="hsl(var(--primary))" strokeWidth={2} radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {isSmallDataset ? (
        <Card>
          <CardHeader>
            <CardTitle>Performance Heatmap</CardTitle>
            <CardDescription>Individual student performance across subjects</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto custom-scrollbar pb-6">
            <div 
              className="grid gap-1 min-w-max" 
              style={{ gridTemplateColumns: `auto repeat(${data.subjectColumns.length}, minmax(40px, 1fr))` }}
            >
              {/* Header Row */}
              <div className="p-2 font-medium text-muted-foreground text-sm flex items-end">Student</div>
              {data.subjectColumns.map((col: string, i: number) => (
                <div key={i} className="p-2 text-xs font-semibold text-center text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis -rotate-45 origin-bottom-left h-24 flex items-end">
                  {col}
                </div>
              ))}

              {/* Data Rows */}
              {data.rawData.map((row: any, r: number) => (
                <div key={r} className="contents group">
                  <div className="p-2 text-sm font-medium border-t border-border group-hover:bg-secondary/50 truncate max-w-[200px]" title={row.studentName}>
                    {showStudentIds ? row.studentName : `Student ${r + 1}`}
                  </div>
                  {data.subjectColumns.map((col: string, c: number) => {
                    const score = Number(row[col]);
                    return (
                      <Tooltip key={c}>
                        <TooltipTrigger asChild>
                          <div className={`p-2 flex items-center justify-center text-xs border rounded-sm transition-transform hover:scale-110 hover:z-10 ${getHeatmapColor(score, passPercentage)}`}>
                            {score}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border border-border">
                          <p className="font-semibold">{col}</p>
                          <p className="text-sm">{showStudentIds ? row.studentName : `Student ${r + 1}`}: <span className="text-primary">{score}</span></p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Heatmap is disabled for datasets with more than 50 students to maintain performance.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
