import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/use-app-store";
import { getStudentIdValue, getStudentNameValue } from "@/lib/student-identifiers";
import { getGradeColor } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 50;

export function DataPreview({ data }: { data: any }) {
  const { passPercentage, showStudentIds } = useAppStore();
  const rawData = data.rawData;
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return rawData;
    }

    return rawData.filter((row: any) => {
      const studentName = String(getStudentNameValue(row, "") ?? "").toLowerCase();
      const studentId = String(getStudentIdValue(row) ?? "").toLowerCase();
      return studentName.includes(term) || studentId.includes(term);
    });
  }, [rawData, searchTerm]);

  const effectivePageSize = pageSize <= 0 ? Math.max(filteredData.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / effectivePageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * effectivePageSize;
  const pageRows = filteredData.slice(pageStart, pageStart + effectivePageSize);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Raw Data</CardTitle>
        <CardDescription>
          Full student list from the uploaded dataset ({filteredData.length}/{rawData.length} records)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto max-h-[70vh] custom-scrollbar">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Search by student name or ID"
            className="sm:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Rows:</label>
            <select
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="-1">All</option>
            </select>
            <div className="text-xs text-muted-foreground">
              Showing {pageRows.length} rows on page {safePage} of {totalPages}
            </div>
          </div>
        </div>

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
            {pageRows.map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                {showStudentIds && <td className="px-6 py-3 font-mono">{getStudentIdValue(row) ?? "-"}</td>}
                <td className="px-6 py-3 font-medium">
                  {showStudentIds
                    ? getStudentNameValue(row, `Student ${pageStart + rowIndex + 1}`)
                    : `Student ${pageStart + rowIndex + 1}`}
                </td>
                {data.subjectColumns.map((col: string, colIndex: number) => (
                  <td key={colIndex} className={`px-6 py-3 ${getGradeColor(Number(row[col]), passPercentage)}`}>
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}

            {pageRows.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-6 text-center text-muted-foreground"
                  colSpan={data.subjectColumns.length + (showStudentIds ? 2 : 1)}
                >
                  No students found for this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
