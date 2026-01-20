import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useSDRAssignments,
  useApproveSDRAssignment,
  useRejectSDRAssignment,
  useDeleteSDRAssignment,
  useSDRCommissionSummary,
} from "@/hooks/useSDR";
import { useAuth } from "@/contexts/AuthContext";
import { AssignSDRModal } from "./AssignSDRModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Search,
  ExternalLink,
  Check,
  X,
  Trash2,
  Loader2,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
} from "lucide-react";

export function SDRManagement() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: assignments, isLoading } = useSDRAssignments(
    statusFilter !== "all" ? statusFilter : undefined
  );
  const { data: summary } = useSDRCommissionSummary();
  const approveAssignment = useApproveSDRAssignment();
  const rejectAssignment = useRejectSDRAssignment();
  const deleteAssignment = useDeleteSDRAssignment();

  const filteredAssignments = assignments?.filter((a) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      a.sale?.external_id?.toLowerCase().includes(searchLower) ||
      a.sale?.client_name?.toLowerCase().includes(searchLower) ||
      a.sdr?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleApprove = async (assignmentId: string) => {
    if (!user?.id) return;
    await approveAssignment.mutateAsync({
      assignmentId,
      approvedBy: user.id,
    });
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await rejectAssignment.mutateAsync({
      assignmentId: rejectId,
      rejectionReason: rejectReason || "Sem motivo especificado",
    });
    setRejectId(null);
    setRejectReason("");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAssignment.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            Pendente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = assignments?.filter((a) => a.status === "pending").length || 0;
  const approvedCount = assignments?.filter((a) => a.status === "approved").length || 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Atribuições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Comissões Liberadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalReleased || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Atribuições de SDR</CardTitle>
            <Button onClick={() => setShowAssignModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Atribuir SDR
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, cliente ou SDR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>SDR</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comprovação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma atribuição de SDR encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments?.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <span className="font-mono text-xs">
                            {assignment.sale?.external_id}
                          </span>
                        </TableCell>
                        <TableCell>{assignment.sale?.client_name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.sdr?.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {assignment.sdr?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{assignment.commission_percent}%</div>
                            <div className="text-muted-foreground">
                              {formatCurrency(
                                (assignment.sale?.total_value || 0) *
                                  (assignment.commission_percent / 100)
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                        <TableCell>
                          <a
                            href={assignment.proof_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Ver <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          {format(new Date(assignment.created_at), "dd/MM/yy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {assignment.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove(assignment.id)}
                                  disabled={approveAssignment.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80">
                                    <div className="space-y-3">
                                      <Label>Motivo da rejeição</Label>
                                      <Textarea
                                        placeholder="Descreva o motivo..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                      />
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => {
                                          setRejectId(assignment.id);
                                          handleReject();
                                        }}
                                        disabled={rejectAssignment.isPending}
                                      >
                                        Confirmar Rejeição
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteId(assignment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {assignment.status === "rejected" && assignment.rejection_reason && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Ver motivo
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <p className="text-sm">{assignment.rejection_reason}</p>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AssignSDRModal open={showAssignModal} onOpenChange={setShowAssignModal} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atribuição de SDR?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atribuição será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
