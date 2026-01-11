import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink, Folder } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Funnel = Database["public"]["Tables"]["funnels"]["Row"];

interface FinishedFunnelsTableProps {
    funnels: Funnel[];
}

export function FinishedFunnelsTable({ funnels }: FinishedFunnelsTableProps) {
    const navigate = useNavigate();

    const openLink = (url: string | null, e: React.MouseEvent) => {
        e.stopPropagation();
        if (url) window.open(url, "_blank");
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome do Funil</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Investimento Final</TableHead>
                        <TableHead>Data de Finalização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {funnels.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                Nenhum funil finalizado encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        funnels.map((funnel) => (
                            <TableRow
                                key={funnel.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => navigate(`/funis/${funnel.id}`)}
                            >
                                <TableCell className="font-medium">{funnel.name}</TableCell>
                                <TableCell>{funnel.product_name || "-"}</TableCell>
                                <TableCell>{(funnel as any).category || "-"}</TableCell>
                                <TableCell>
                                    {funnel.predicted_investment
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(funnel.predicted_investment)
                                        : "-"
                                    }
                                </TableCell>
                                <TableCell>
                                    {new Date(funnel.updated_at).toLocaleDateString()}
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
