import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppStore } from "@/store/use-app-store";
import { getGradeColor } from "@/lib/utils";

export function DataPreview({ data }: { data: any }) {
  const { passPercentage, showStudentIds } = useAppStore();
  const rawData = data.rawData.slice(0, 15); // Show first 15 rows

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Raw Data Preview</CardTitle>
        <CardDescription>First 15 records from the uploaded dataset</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
            <tr>
              {showStudentIds && <th className="px-6 py-4 rounded-tl-xl">Student ID</th>}
              <th className={`px-6 py-4 ${!showStudentIds ? 'rounded-tl-xl' : ''}`}>Student Name</th>
              {data.subjectColumns.map((col: string, i: number) => (
                <th key={i} className={`px-6 py-4 ${i === data.subjectColumns.length - 1 ? 'rounded-tr-xl' : ''}`}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawData.map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                {showStudentIds && <td className="px-6 py-3 font-mono">{row.studentId}</td>}
                <td className="px-6 py-3 font-medium">
                  {showStudentIds ? row.studentName : `Student ${rowIndex + 1}`}
                </td>
                {data.subjectColumns.map((col: string, colIndex: number) => (
                  <td key={colIndex} className={`px-6 py-3 ${getGradeColor(Number(row[col]), passPercentage)}`}>
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
