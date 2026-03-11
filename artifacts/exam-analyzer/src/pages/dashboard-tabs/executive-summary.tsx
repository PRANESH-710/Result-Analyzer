import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, BookOpen, Percent, ActivitySquare } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { formatDecimals } from "@/lib/utils";

export function ExecutiveSummary({ data }: { data: any }) {
  const { decimals } = useAppStore();
  const analysis = data.analysis;

  const scoreDistData = useMemo(() => {
    if (!data.rawData || !data.subjectColumns) return [];
    const dist = { '0-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    data.rawData.forEach((row: any) => {
      data.subjectColumns.forEach((sub: string) => {
        const val = Number(row[sub]);
        if (!isNaN(val)) {
          if (val <= 40) dist['0-40']++;
          else if (val <= 60) dist['41-60']++;
          else if (val <= 80) dist['61-80']++;
          else dist['81-100']++;
        }
      });
    });
    return Object.entries(dist).map(([range, count]) => ({ range, count }));
  }, [data]);

  const pieData = [
    { name: 'Passed', value: analysis.departmentPassRate },
    { name: 'Failed', value: 100 - analysis.departmentPassRate }
  ];
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard icon={<Users />} title="Total Students" value={analysis.totalStudents} />
        <MetricCard icon={<BookOpen />} title="Total Subjects" value={analysis.totalSubjects} />
        <MetricCard icon={<Percent />} title="Pass Rate" value={`${formatDecimals(analysis.departmentPassRate, decimals)}%`} trend={analysis.departmentPassRate > 50 ? 'good' : 'bad'} />
        <MetricCard icon={<ActivitySquare />} title="Avg Score" value={`${formatDecimals(analysis.averageScore, decimals)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Pass vs Fail</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => `${formatDecimals(val, decimals)}%`}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, trend }: any) {
  return (
    <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground">{value}</p>
          </div>
          <div className={`p-4 rounded-2xl ${trend === 'bad' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
