import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAppStore } from "@/store/use-app-store";
import { getStudentIdValue, getStudentNameValue } from "@/lib/student-identifiers";
import { formatDecimals } from "@/lib/utils";

type StudentSubjectRow = {
  position: number;
  studentId: string;
  studentName: string;
  score: number | null;
  status: "Pass" | "Fail" | "No Mark";
};

export function SubjectPerformance({ data }: { data: any }) {
  const { decimals, showStudentIds } = useAppStore();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pass" | "Fail" | "No Mark">("All");
  
  const chartData = useMemo(() => {
    if (!data?.analysis?.subjectWiseStats) {
      return [];
    }

    return Object.entries(data.analysis.subjectWiseStats).map(([subject, stats]: [string, any]) => ({
      subject,
      passRate: Number(stats.passRate),
      avgScore: Number(stats.averageScore),
      passedCount: Number(stats.passedCount),
      failedCount: Number(stats.failedCount),
      totalCount: Number(stats.totalCount),
      threshold: Number(data.analysis.subjectPassPercentages?.[subject] ?? data.analysis.passPercentage),
    }));
  }, [data]);

  useEffect(() => {
    if (chartData.length === 0) {
      setSelectedSubject(null);
      return;
    }

    const hasSelected = selectedSubject
      ? chartData.some((entry) => entry.subject === selectedSubject)
      : false;

    if (!hasSelected) {
      setSelectedSubject(chartData[0].subject);
    }
  }, [chartData, selectedSubject]);

  useEffect(() => {
    setSearchTerm("");
    setStatusFilter("All");
  }, [selectedSubject]);

  const selectedSubjectSummary = useMemo(() => {
    if (!selectedSubject) {
      return null;
    }

    return chartData.find((entry) => entry.subject === selectedSubject) ?? null;
  }, [chartData, selectedSubject]);

  const selectedSubjectRows = useMemo(() => {
    if (!selectedSubject) {
      return [];
    }

    const threshold = Number(
      data?.analysis?.subjectPassPercentages?.[selectedSubject] ?? data?.analysis?.passPercentage ?? 0,
    );

    const rows: StudentSubjectRow[] = (data?.rawData ?? []).map((row: Record<string, unknown>, index: number) => {
      const value = Number(row[selectedSubject]);
      const hasScore = Number.isFinite(value);

      return {
        position: index + 1,
        studentId: getStudentIdValue(row) ?? "-",
        studentName: getStudentNameValue(row, `Student ${index + 1}`),
        score: hasScore ? value : null,
        status: hasScore ? (value >= threshold ? "Pass" : "Fail") : "No Mark",
      };
    });

    return rows.sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });
  }, [data, selectedSubject]);

  const filteredSubjectRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return selectedSubjectRows.filter((row) => {
      if (statusFilter !== "All" && row.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        row.studentName.toLowerCase().includes(normalizedSearch) ||
        row.studentId.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [searchTerm, selectedSubjectRows, statusFilter]);

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
          <CardTitle>Select Subject</CardTitle>
          <CardDescription>Click a subject to view all student marks for that subject</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {chartData.map((entry) => (
            <Button
              key={entry.subject}
              type="button"
              variant={selectedSubject === entry.subject ? "default" : "outline"}
              onClick={() => setSelectedSubject(entry.subject)}
              className="h-8"
            >
              {entry.subject}
            </Button>
          ))}
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedSubject ? `${selectedSubject} - Student Marks` : "Subject Marks"}
          </CardTitle>
          <CardDescription>
            {selectedSubjectSummary
              ? `Pass threshold ${formatDecimals(selectedSubjectSummary.threshold, decimals)} | Pass ${selectedSubjectSummary.passedCount}/${selectedSubjectSummary.totalCount}`
              : "Select a subject to view detailed marks"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          {!selectedSubject ? (
            <p className="text-sm text-muted-foreground">No subject available.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by student name or ID"
                  className="sm:max-w-sm"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Filter:</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as "All" | "Pass" | "Fail" | "No Mark")}
                    className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="All">All</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                    <option value="No Mark">No Mark</option>
                  </select>
                  <div className="text-xs text-muted-foreground">
                    Showing {filteredSubjectRows.length}/{selectedSubjectRows.length}
                  </div>
                </div>
              </div>

              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-xl">#</th>
                    {showStudentIds ? <th className="px-4 py-3">Student ID</th> : null}
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Mark</th>
                    <th className="px-4 py-3 rounded-tr-xl">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjectRows.map((row) => (
                    <tr key={`${row.studentId}-${row.position}`} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{row.position}</td>
                      {showStudentIds ? <td className="px-4 py-3 font-mono">{row.studentId}</td> : null}
                      <td className="px-4 py-3 font-medium">{row.studentName}</td>
                      <td className="px-4 py-3">
                        {row.score === null ? "-" : formatDecimals(row.score, decimals)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.status === "Pass"
                              ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-500"
                              : row.status === "Fail"
                                ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-500/15 text-orange-500"
                                : "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredSubjectRows.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-6 text-center text-muted-foreground"
                        colSpan={showStudentIds ? 5 : 4}
                      >
                        No students found for this filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
