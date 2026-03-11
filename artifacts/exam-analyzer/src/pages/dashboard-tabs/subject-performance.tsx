import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAppStore } from "@/store/use-app-store";
import { formatDecimals } from "@/lib/utils";

export function SubjectPerformance({ data }: { data: any }) {
  const { decimals } = useAppStore();
  
  const chartData = useMemo(() => {
    return Object.entries(data.analysis.subjectWiseStats).map(([subject, stats]: any) => ({
      subject,
      passRate: Number(stats.passRate),
      avgScore: Number(stats.averageScore)
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatDecimals(entry.value, decimals)}{unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subject Pass Rates</CardTitle>
          <CardDescription>Percentage of students passing each subject</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="subject" angle={-45} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip unit="%" />} cursor={{ fill: 'hsl(var(--secondary)/0.5)' }} />
              <Bar dataKey="passRate" name="Pass Rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject Average Scores</CardTitle>
          <CardDescription>Average score obtained in each subject</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="subject" angle={-45} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip unit="" />} cursor={{ fill: 'hsl(var(--secondary)/0.5)' }} />
              <Bar dataKey="avgScore" name="Average Score" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
