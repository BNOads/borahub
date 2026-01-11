import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ExternalLink, Folder, Pencil, Trash2 } from "lucide-react";
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

type Funnel = Database["public"]["Tables"]["funnels"]["Row"];

interface ActiveFunnelsTableProps {
    funnels: Funnel[];
    onUpdate: () => void;
}

export function ActiveFunnelsTable({ funnels, onUpdate }: ActiveFunnelsTableProps) {
    const navigate = useNavigate();

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

    return (
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
                        <TableHead>Investimento Previsto</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {funnels.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                Nenhum funil ativo encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        funnels.map((funnel) => (
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
    );
}
