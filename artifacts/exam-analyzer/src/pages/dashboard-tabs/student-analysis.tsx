import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useAppStore } from "@/store/use-app-store";

export function StudentAnalysis({ data }: { data: any }) {
  const { passPercentage } = useAppStore();

  const passedCountDist = useMemo(() => {
    if (!data.rawData || !data.subjectColumns) return [];
    const counts: Record<number, number> = {};
    for (let i = 0; i <= data.subjectColumns.length; i++) counts[i] = 0;

    data.rawData.forEach((row: any) => {
      let passed = 0;
      data.subjectColumns.forEach((sub: string) => {
        if (Number(row[sub]) >= passPercentage) passed++;
      });
      counts[passed]++;
    });

    return Object.entries(counts).map(([passedSubjects, numStudents]) => ({
      passedSubjects: `${passedSubjects} Subjects`,
      students: numStudents
    }));
  }, [data, passPercentage]);

  const pieData = [
    { name: 'Passed All', value: data.analysis.studentsPassedAll },
    { name: 'Failed Any', value: data.analysis.studentsFailedAny }
  ];
  const COLORS = ['hsl(var(--emerald-500, 150 84% 39%))', 'hsl(var(--orange-500, 24 94% 50%))'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Students by Subjects Passed</CardTitle>
          <CardDescription>Number of students passing N subjects</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={passedCountDist} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="passedSubjects" stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                cursor={{ fill: 'hsl(var(--secondary)/0.5)' }}
              />
              <Bar dataKey="students" name="Students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pass All vs Fail Any</CardTitle>
          <CardDescription>Clearer view vs clear fails</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={130}
                dataKey="value"
                stroke="none"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
