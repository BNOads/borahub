import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Folder, Pencil, Trash2, AlertTriangle, ArrowUpDown, CalendarClock, DollarSign, SortAsc } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

type Funnel = Database["public"]["Tables"]["funnels"]["Row"];

interface ActiveFunnelsTableProps {
    funnels: Funnel[];
    onUpdate: () => void;
}

type SortOption = 'pending' | 'date' | 'investment' | 'alpha';

export function ActiveFunnelsTable({ funnels, onUpdate }: ActiveFunnelsTableProps) {
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState<SortOption>('pending');

    // Fetch pending checklist items for all funnels
    const { data: funnelChecklistPending = {} } = useQuery({
        queryKey: ['funnels-table-checklist-pending', funnels.map(f => f.id)],
        queryFn: async () => {
            if (!funnels.length) return {};

            const { data: checklistItems } = await supabase
                .from("funnel_checklist")
                .select("funnel_id, is_completed")
                .in("funnel_id", funnels.map(f => f.id));

            if (!checklistItems?.length) return {};

            const pending: Record<string, number> = {};
            funnels.forEach(f => {
                const funnelItems = checklistItems.filter(item => item.funnel_id === f.id);
                pending[f.id] = funnelItems.filter(item => !item.is_completed).length;
            });

            return pending;
        },
        enabled: funnels.length > 0,
        staleTime: 2 * 60 * 1000,
    });

    const getClosestDate = (funnel: Funnel): Date | null => {
        const now = new Date();
        const dates = [
            funnel.captacao_start,
            funnel.captacao_end,
            funnel.aquecimento_start,
            funnel.aquecimento_end,
            funnel.carrinho_start,
            funnel.fechamento_date,
            funnel.cpl_start,
            funnel.cpl_end,
            funnel.lembrete_start,
        ]
            .filter(Boolean)
            .map(d => new Date(d!))
            .filter(d => d >= now)
            .sort((a, b) => a.getTime() - b.getTime());

        return dates.length > 0 ? dates[0] : null;
    };

    // Sort funnels based on selected option
    const sortedFunnels = [...funnels].sort((a, b) => {
        switch (sortBy) {
            case 'date': {
                const dateA = getClosestDate(a);
                const dateB = getClosestDate(b);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
            }
            case 'investment':
                return (b.predicted_investment || 0) - (a.predicted_investment || 0);
            case 'alpha':
                return a.name.localeCompare(b.name, 'pt-BR');
            case 'pending':
            default:
                return (funnelChecklistPending[b.id] || 0) - (funnelChecklistPending[a.id] || 0);
        }
    });

    const handleToggleActive = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { error } = await supabase
                .from("funnels")
                .update({ is_active: !currentStatus })
                .eq("id", id);

            if (error) throw error;
            onUpdate();
            toast.success("Status atualizado com sucesso!");
        } catch (error) {
            console.error("Error updating funnel status:", error);
            toast.error("Erro ao atualizar status");
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { error } = await supabase
                .from("funnels")
                .delete()
                .eq("id", id);

            if (error) throw error;
            onUpdate();
            toast.success("Funil excluído com sucesso!");
        } catch (error) {
            console.error("Error deleting funnel:", error);
            toast.error("Erro ao excluir funil");
        }
    };

    const openLink = (url: string | null, e: React.MouseEvent) => {
        e.stopPropagation();
        if (url) window.open(url, "_blank");
    };

    const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
        { value: 'pending', label: 'Pendências', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
        { value: 'date', label: 'Data próxima', icon: <CalendarClock className="h-3.5 w-3.5" /> },
        { value: 'investment', label: 'Investimento', icon: <DollarSign className="h-3.5 w-3.5" /> },
        { value: 'alpha', label: 'A-Z', icon: <SortAsc className="h-3.5 w-3.5" /> },
    ];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-1">Ordenar:</span>
                {sortOptions.map((opt) => (
                    <Button
                        key={opt.value}
                        variant={sortBy === opt.value ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5 h-8"
                        onClick={() => setSortBy(opt.value)}
                    >
                        {opt.icon}
                        {opt.label}
                    </Button>
                ))}
            </div>

            <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox />
                        </TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Nome do Funil / Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Pendências</TableHead>
                        <TableHead>Investimento Previsto</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedFunnels.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                Nenhum funil ativo encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedFunnels.map((funnel) => (
                            <TableRow
                                key={funnel.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => navigate(`/funis/${funnel.id}`)}
                            >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox />
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={funnel.is_active}
                                        onClick={(e) => handleToggleActive(funnel.id, funnel.is_active, e)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{funnel.name}</span>
                                        {funnel.product_name && (
                                            <span className="text-xs text-muted-foreground opacity-70">
                                                {funnel.product_name}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{(funnel as any).category || "-"}</TableCell>
                                <TableCell>
                                    {funnelChecklistPending[funnel.id] > 0 ? (
                                        <Badge 
                                            variant="outline" 
                                            className="border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/30 gap-1"
                                        >
                                            <AlertTriangle className="h-3 w-3" />
                                            {funnelChecklistPending[funnel.id]}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {funnel.predicted_investment
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(funnel.predicted_investment)
                                        : "-"
                                    }
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {funnel.drive_link && (
                                            <Button variant="ghost" size="icon" onClick={(e) => openLink(funnel.drive_link, e)} title="Pasta no Drive">
                                                <Folder className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {funnel.dashboard_link && (
                                            <Button variant="ghost" size="icon" onClick={(e) => openLink(funnel.dashboard_link, e)} title="Dashboard">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/funis/${funnel.id}`);
                                            }}
                                            title="Editar"
                                        >
                                            <Pencil className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta ação não pode ser desfeita. O funil será excluído permanentemente.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={(e) => handleDelete(funnel.id, e)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Excluir
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            </div>
        </div>
    );
}
