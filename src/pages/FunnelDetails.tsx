import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ExternalLink, Folder, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Funnel = Database["public"]["Tables"]["funnels"]["Row"] & { category?: string };

const CATEGORIES = [
    "E-book",
    "High ticket",
    "low-ticket",
    "Lançamento",
    "Meteórico",
    "Reabertura"
];

export default function FunnelDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [funnel, setFunnel] = useState<Funnel | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<Funnel>>({});

    useEffect(() => {
        const fetchFunnel = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from("funnels")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) throw error;
                setFunnel(data);
                setFormData(data);
            } catch (error) {
                console.error("Error fetching funnel:", error);
                toast.error("Erro ao carregar funil");
            } finally {
                setLoading(false);
            }
        };

        fetchFunnel();
    }, [id]);

    const handleSave = async () => {
        if (!id || !formData) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("funnels")
                .update({
                    name: formData.name,
                    product_name: formData.product_name,
                    category: formData.category,
                    predicted_investment: formData.predicted_investment,
                    drive_link: formData.drive_link,
                    dashboard_link: formData.dashboard_link,
                    briefing_link: formData.briefing_link,
                    status: formData.status,
                    is_active: formData.is_active
                })
                .eq("id", id);

            if (error) throw error;
            toast.success("Funil atualizado com sucesso!");
            setFunnel({ ...funnel!, ...formData } as Funnel);
        } catch (error) {
            console.error("Error updating funnel:", error);
            toast.error("Erro ao salvar alterações");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Carregando...</div>;
    if (!funnel) return <div>Funil não encontrado</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/funis")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{funnel.name}</h1>
                    <p className="text-muted-foreground">Detalhes do funil</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome do Funil</Label>
                            <Input
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Produto</Label>
                            <Input
                                value={formData.product_name || ""}
                                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select
                                value={formData.category || ""}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Investimento Previsto</Label>
                            <Input
                                type="number"
                                value={formData.predicted_investment || 0}
                                onChange={(e) => setFormData({ ...formData, predicted_investment: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex items-center gap-2 pt-2">
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {formData.is_active ? "Ativo" : "Inativo"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                        <div className="space-y-2">
                            <Label>Link da Pasta</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.drive_link || ""}
                                    onChange={(e) => setFormData({ ...formData, drive_link: e.target.value })}
                                />
                                {formData.drive_link && (
                                    <Button size="icon" variant="ghost" onClick={() => window.open(formData.drive_link!, "_blank")}>
                                        <Folder className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Dashboard</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.dashboard_link || ""}
                                    onChange={(e) => setFormData({ ...formData, dashboard_link: e.target.value })}
                                />
                                {formData.dashboard_link && (
                                    <Button size="icon" variant="ghost" onClick={() => window.open(formData.dashboard_link!, "_blank")}>
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Briefing</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.briefing_link || ""}
                                    onChange={(e) => setFormData({ ...formData, briefing_link: e.target.value })}
                                />
                                {formData.briefing_link && (
                                    <Button size="icon" variant="ghost" onClick={() => window.open(formData.briefing_link!, "_blank")}>
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6">
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="h-4 w-4" />
                            {saving ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
