import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Save, User, Calendar as CalendarIcon, ArrowUpDown, ChevronLeft, ChevronRight, Filter, Pencil } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useFunnelDailyReports, useTodayReport, useCreateDailyReport, useUpdateFunnelResponsible, useUpdateDailyReport, FunnelDailyReport as FunnelDailyReportType } from "@/hooks/useFunnelDailyReports";
import { useQuery } from "@tanstack/react-query";
import { FunnelData } from "./types";
import { cn } from "@/lib/utils";

interface FunnelDailyReportProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

type SortField = "report_date" | "contacts" | "followups" | "reschedules" | "meetings_scheduled" | "meetings_held" | "no_shows" | "sales";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 30;

export function FunnelDailyReport({ funnel, onUpdate }: FunnelDailyReportProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  
  const { data: reports, isLoading: loadingReports } = useFunnelDailyReports(funnel.id);
  const { data: existingReport } = useTodayReport(funnel.id, selectedDateStr);
  const createReport = useCreateDailyReport();
  const updateReport = useUpdateDailyReport();
  const updateResponsible = useUpdateFunnelResponsible();

  const [editingReport, setEditingReport] = useState<FunnelDailyReportType | null>(null);
  const [editFormData, setEditFormData] = useState({
    contacts: 0,
    followups: 0,
    reschedules: 0,
    meetings_scheduled: 0,
    meetings_held: 0,
    no_shows: 0,
    sales: 0,
    summary: "",
  });

  const [formData, setFormData] = useState({
    contacts: 0,
    followups: 0,
    reschedules: 0,
    meetings_scheduled: 0,
    meetings_held: 0,
    no_shows: 0,
    sales: 0,
    summary: "",
  });

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("report_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Date filter state
  const [dateFilter, setDateFilter] = useState<"30d" | "7d" | "custom">("30d");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Load existing report data for selected date
  useEffect(() => {
    if (existingReport) {
      setFormData({
        contacts: existingReport.contacts,
        followups: existingReport.followups,
        reschedules: existingReport.reschedules,
        meetings_scheduled: existingReport.meetings_scheduled,
        meetings_held: existingReport.meetings_held,
        no_shows: existingReport.no_shows,
        sales: existingReport.sales,
        summary: existingReport.summary || "",
      });
    } else {
      // Reset form when changing to a date without report
      setFormData({
        contacts: 0,
        followups: 0,
        reschedules: 0,
        meetings_scheduled: 0,
        meetings_held: 0,
        no_shows: 0,
        sales: 0,
        summary: "",
      });
    }
  }, [existingReport, selectedDateStr]);

  // Fetch users for responsible selector
  const { data: users } = useQuery({
    queryKey: ["users-for-responsible"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    if (!reports) return [];

    let filtered = [...reports];

    // Apply date filter
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    if (dateFilter === "7d") {
      startDate = startOfDay(subDays(now, 7));
    } else if (dateFilter === "30d") {
      startDate = startOfDay(subDays(now, 30));
    } else {
      startDate = customDateRange.from ? startOfDay(customDateRange.from) : startOfDay(subDays(now, 30));
      endDate = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(now);
    }

    filtered = filtered.filter((report) => {
      const reportDate = new Date(report.report_date);
      return isWithinInterval(reportDate, { start: startDate, end: endDate });
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "report_date") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    return filtered;
  }, [reports, sortField, sortDirection, dateFilter, customDateRange]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSortedReports.length / ITEMS_PER_PAGE);
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedReports.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedReports, currentPage]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredAndSortedReports.reduce(
      (acc, report) => ({
        contacts: acc.contacts + report.contacts,
        followups: acc.followups + report.followups,
        reschedules: acc.reschedules + report.reschedules,
        meetings_scheduled: acc.meetings_scheduled + report.meetings_scheduled,
        meetings_held: acc.meetings_held + report.meetings_held,
        no_shows: acc.no_shows + report.no_shows,
        sales: acc.sales + report.sales,
      }),
      { contacts: 0, followups: 0, reschedules: 0, meetings_scheduled: 0, meetings_held: 0, no_shows: 0, sales: 0 }
    );
  }, [filteredAndSortedReports]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReport.mutateAsync({
      funnel_id: funnel.id,
      funnel_name: funnel.name,
      report_date: selectedDateStr,
      ...formData,
    });
  };

  const handleResponsibleChange = async (userId: string) => {
    await updateResponsible.mutateAsync({
      funnelId: funnel.id,
      userId: userId === "none" ? null : userId,
    });
    onUpdate();
  };

  const openEditModal = (report: FunnelDailyReportType) => {
    setEditingReport(report);
    setEditFormData({
      contacts: report.contacts,
      followups: report.followups,
      reschedules: report.reschedules,
      meetings_scheduled: report.meetings_scheduled,
      meetings_held: report.meetings_held,
      no_shows: report.no_shows,
      sales: report.sales,
      summary: report.summary || "",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    
    await updateReport.mutateAsync({
      id: editingReport.id,
      funnel_id: funnel.id,
      ...editFormData,
    });
    setEditingReport(null);
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="text-center cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        <ArrowUpDown className={cn("h-3 w-3", sortField === field && "text-primary")} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Responsável */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Responsável pelo Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={(funnel as any).responsible_user_id || "none"}
            onValueChange={handleResponsibleChange}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Selecionar responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum responsável</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Formulário do dia */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5" />
              Relatório do Dia
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-fit">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contacts">Contatos</Label>
                <Input
                  id="contacts"
                  type="number"
                  min="0"
                  value={formData.contacts}
                  onChange={(e) => setFormData({ ...formData, contacts: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followups">Follow-ups</Label>
                <Input
                  id="followups"
                  type="number"
                  min="0"
                  value={formData.followups}
                  onChange={(e) => setFormData({ ...formData, followups: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedules">Reagendamentos</Label>
                <Input
                  id="reschedules"
                  type="number"
                  min="0"
                  value={formData.reschedules}
                  onChange={(e) => setFormData({ ...formData, reschedules: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetings_scheduled">Reuniões Agendadas</Label>
                <Input
                  id="meetings_scheduled"
                  type="number"
                  min="0"
                  value={formData.meetings_scheduled}
                  onChange={(e) => setFormData({ ...formData, meetings_scheduled: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetings_held">Reuniões Realizadas</Label>
                <Input
                  id="meetings_held"
                  type="number"
                  min="0"
                  value={formData.meetings_held}
                  onChange={(e) => setFormData({ ...formData, meetings_held: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="no_shows">No-shows</Label>
                <Input
                  id="no_shows"
                  type="number"
                  min="0"
                  value={formData.no_shows}
                  onChange={(e) => setFormData({ ...formData, no_shows: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales">Vendas</Label>
                <Input
                  id="sales"
                  type="number"
                  min="0"
                  value={formData.sales}
                  onChange={(e) => setFormData({ ...formData, sales: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Resumo do Dia</Label>
              <Textarea
                id="summary"
                placeholder="Descreva as principais atividades e observações do dia..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={createReport.isPending} className="w-full md:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {existingReport ? "Atualizar Relatório" : "Salvar Relatório"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Histórico de Relatórios
            </CardTitle>

            {/* Filtros de data */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Período:</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={dateFilter === "7d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setDateFilter("7d"); setCurrentPage(1); }}
                >
                  7 dias
                </Button>
                <Button
                  variant={dateFilter === "30d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setDateFilter("30d"); setCurrentPage(1); }}
                >
                  30 dias
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={dateFilter === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("custom")}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Personalizado
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={{ from: customDateRange.from, to: customDateRange.to }}
                      onSelect={(range) => {
                        setCustomDateRange({ from: range?.from, to: range?.to });
                        setCurrentPage(1);
                      }}
                      locale={ptBR}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="text-center py-4 text-muted-foreground">Carregando...</div>
          ) : filteredAndSortedReports.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="report_date">Data</SortableHeader>
                      <SortableHeader field="contacts">Contatos</SortableHeader>
                      <SortableHeader field="followups">Follow-ups</SortableHeader>
                      <SortableHeader field="reschedules">Reagend.</SortableHeader>
                      <SortableHeader field="meetings_scheduled">Agendadas</SortableHeader>
                      <SortableHeader field="meetings_held">Realizadas</SortableHeader>
                      <SortableHeader field="no_shows">No-show</SortableHeader>
                      <SortableHeader field="sales">Vendas</SortableHeader>
                      <TableHead>Resumo</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium whitespace-nowrap text-center">
                          {format(new Date(report.report_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-center">{report.contacts}</TableCell>
                        <TableCell className="text-center">{report.followups}</TableCell>
                        <TableCell className="text-center">{report.reschedules}</TableCell>
                        <TableCell className="text-center">{report.meetings_scheduled}</TableCell>
                        <TableCell className="text-center">{report.meetings_held}</TableCell>
                        <TableCell className="text-center">{report.no_shows}</TableCell>
                        <TableCell className="text-center">{report.sales}</TableCell>
                        <TableCell className="max-w-xs truncate">{report.summary || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(report)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="text-center">TOTAL</TableCell>
                      <TableCell className="text-center">{totals.contacts}</TableCell>
                      <TableCell className="text-center">{totals.followups}</TableCell>
                      <TableCell className="text-center">{totals.reschedules}</TableCell>
                      <TableCell className="text-center">{totals.meetings_scheduled}</TableCell>
                      <TableCell className="text-center">{totals.meetings_held}</TableCell>
                      <TableCell className="text-center">{totals.no_shows}</TableCell>
                      <TableCell className="text-center">{totals.sales}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} ({filteredAndSortedReports.length} registros)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum relatório no período selecionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edição */}
      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Relatório - {editingReport && format(new Date(editingReport.report_date), "dd/MM/yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Contatos</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.contacts}
                  onChange={(e) => setEditFormData({ ...editFormData, contacts: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Follow-ups</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.followups}
                  onChange={(e) => setEditFormData({ ...editFormData, followups: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reagendamentos</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.reschedules}
                  onChange={(e) => setEditFormData({ ...editFormData, reschedules: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reuniões Agendadas</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.meetings_scheduled}
                  onChange={(e) => setEditFormData({ ...editFormData, meetings_scheduled: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reuniões Realizadas</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.meetings_held}
                  onChange={(e) => setEditFormData({ ...editFormData, meetings_held: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>No-shows</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.no_shows}
                  onChange={(e) => setEditFormData({ ...editFormData, no_shows: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vendas</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.sales}
                  onChange={(e) => setEditFormData({ ...editFormData, sales: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Resumo do dia</Label>
              <Textarea
                placeholder="Descreva as principais atividades e observações do dia..."
                value={editFormData.summary}
                onChange={(e) => setEditFormData({ ...editFormData, summary: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingReport(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateReport.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}