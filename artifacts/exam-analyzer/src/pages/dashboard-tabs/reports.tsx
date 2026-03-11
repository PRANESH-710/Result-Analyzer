import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";
import { useExportExcel, useExportPdf, useExportMarkdown } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-app-store";
import { useToast } from "@/hooks/use-toast";

export function Reports({ data }: { data: any }) {
  const { showStudentIds } = useAppStore();
  const { toast } = useToast();
  
  const excelMutation = useExportExcel();
  const pdfMutation = useExportPdf();
  const mdMutation = useExportMarkdown();

  const exportPayload = {
    analysisData: data.analysis,
    showStudentIds,
    rawData: data.rawData,
    subjectColumns: data.subjectColumns
  };

  const handleDownloadExcel = () => {
    excelMutation.mutate({ data: exportPayload }, {
      onSuccess: (blob) => downloadBlob(blob, "Analysis_Report.xlsx"),
      onError: () => toast({ title: "Export Failed", variant: "destructive" })
    });
  };

  const handleDownloadPdf = () => {
    pdfMutation.mutate({ data: exportPayload }, {
      onSuccess: (blob) => downloadBlob(blob, "Analysis_Report.pdf"),
      onError: () => toast({ title: "Export Failed", variant: "destructive" })
    });
  };

  const handleDownloadMd = () => {
    mdMutation.mutate({ data: exportPayload }, {
      onSuccess: (text) => {
        const blob = new Blob([text], { type: "text/markdown" });
        downloadBlob(blob, "Analysis_Report.md");
      },
      onError: () => toast({ title: "Export Failed", variant: "destructive" })
    });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: `Downloaded ${filename}` });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <ExportCard 
        title="Excel Report" 
        desc="Detailed spreadsheets with raw data and compiled statistics."
        icon={<FileSpreadsheet className="w-8 h-8" />}
        colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        onDownload={handleDownloadExcel}
        isPending={excelMutation.isPending}
      />
      <ExportCard 
        title="PDF Report" 
        desc="Print-ready document with charts and executive summaries."
        icon={<FileText className="w-8 h-8" />}
        colorClass="text-red-400 bg-red-500/10 border-red-500/20"
        onDownload={handleDownloadPdf}
        isPending={pdfMutation.isPending}
      />
      <ExportCard 
        title="Markdown Export" 
        desc="Plain text format perfect for wikis and documentation."
        icon={<FileText className="w-8 h-8" />}
        colorClass="text-blue-400 bg-blue-500/10 border-blue-500/20"
        onDownload={handleDownloadMd}
        isPending={mdMutation.isPending}
      />
    </div>
  );
}

function ExportCard({ title, desc, icon, colorClass, onDownload, isPending }: any) {
  return (
    <Card className="flex flex-col h-full group hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border ${colorClass} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-6">
        <Button 
          className="w-full" 
          onClick={onDownload}
          disabled={isPending}
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Download File</>}
        </Button>
      </CardContent>
    </Card>
  );
}
