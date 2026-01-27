import { useState } from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useGenerateReport, REPORT_TYPES, REPORT_SCOPES, GenerateReportParams } from "@/hooks/useReports";

interface CreateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (reportId: string) => void;
}

interface DateRangeState {
  from: Date | undefined;
  to: Date | undefined;
};

const QUICK_PERIODS = [
  { label: "Última semana", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Esta semana", getValue: () => ({ from: startOfWeek(new Date(), { locale: ptBR }), to: endOfWeek(new Date(), { locale: ptBR }) }) },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
];

export function CreateReportModal({ open, onOpenChange, onSuccess }: CreateReportModalProps) {
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("custom");
  const [dateRange, setDateRange] = useState<DateRangeState>({ from: subDays(new Date(), 7), to: new Date() });
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["events", "funnels", "sales", "tasks"]);

  const generateReport = useGenerateReport();

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleQuickPeriod = (getValue: () => { from: Date; to: Date }) => {
    setDateRange(getValue());
  };

  const handleSubmit = async () => {
    if (!dateRange.from || !dateRange.to || selectedScopes.length === 0) return;

    const params: GenerateReportParams = {
      title: title || `Relatório ${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM/yyyy")}`,
      report_type: reportType,
      period_start: format(dateRange.from, "yyyy-MM-dd"),
      period_end: format(dateRange.to, "yyyy-MM-dd"),
      scope: selectedScopes,
    };

    const result = await generateReport.mutateAsync(params);
    
    if (result?.id) {
      onSuccess?.(result.id);
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle("");
    setReportType("custom");
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    setSelectedScopes(["events", "funnels", "sales", "tasks"]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Novo Relatório com IA
          </DialogTitle>
          <DialogDescription>
            Selecione o período e os dados que deseja incluir. A IA irá consolidar e gerar um relatório executivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 overflow-y-auto flex-1 pr-1">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              placeholder="Ex: Relatório Semanal de Operações"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Tipo de Relatório */}
          <div className="space-y-2">
            <Label>Tipo de Relatório</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Período */}
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_PERIODS.map((period) => (
                <Button
                  key={period.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPeriod(period.getValue)}
                  className="text-xs"
                >
                  {period.label}
                </Button>
              ))}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecione o período"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Escopo */}
          <div className="space-y-3">
            <Label>Dados a incluir</Label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_SCOPES.map((scope) => (
                <div
                  key={scope.value}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors",
                    selectedScopes.includes(scope.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => handleScopeToggle(scope.value)}
                >
                  <Checkbox
                    checked={selectedScopes.includes(scope.value)}
                    onCheckedChange={() => handleScopeToggle(scope.value)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">{scope.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!dateRange.from || !dateRange.to || selectedScopes.length === 0 || generateReport.isPending}
          >
            {generateReport.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
