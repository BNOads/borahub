import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface CreateFunnelModalProps {
    onFunnelCreated: () => void;
}

interface FormData {
    name: string;
    product_name: string;
    category: string;
    predicted_investment: number;
    drive_link: string;
    dashboard_link: string;
    briefing_link: string;
}

const CATEGORIES = [
    "E-book",
    "High ticket",
    "low-ticket",
    "Lançamento",
    "Meteórico",
    "Reabertura"
];

export function CreateFunnelModal({ onFunnelCreated }: CreateFunnelModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>();

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            // Ensure investment is a valid number
            let investment = 0;
            if (data.predicted_investment) {
                const parsed = parseFloat(String(data.predicted_investment));
                if (!isNaN(parsed)) {
                    investment = parsed;
                }
            }

            console.log("Submitting funnel data:", { ...data, predicted_investment: investment });

            const { error } = await supabase
                .from("funnels")
                .insert({
                    name: data.name,
                    product_name: data.product_name || null,
                    category: data.category || null,
                    predicted_investment: investment,
                    drive_link: data.drive_link || null,
                    dashboard_link: data.dashboard_link || null,
                    briefing_link: data.briefing_link || null,
                    status: "active",
                    is_active: true
                });

            if (error) {
                console.error("Supabase insert error:", error);
                throw error;
            };

            toast.success("Funil criado com sucesso!");
            setOpen(false);
            reset();
            onFunnelCreated();
        } catch (error: any) {
            console.error("Error creating funnel:", error);
            // Show more detailed error message to user
            const errorMessage = error.message || error.details || "Erro desconhecido ao criar funil";
            toast.error(`Erro ao criar funil: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Novo Funil
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criar Novo Funil</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Funil</Label>
                        <Input id="name" {...register("name", { required: "Nome é obrigatório" })} />
                        {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="product_name">Produto</Label>
                            <Input id="product_name" {...register("product_name")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Controller
                                name="category"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="predicted_investment">Investimento Previsto (R$)</Label>
                        <Input
                            id="predicted_investment"
                            type="number"
                            step="0.01"
                            {...register("predicted_investment")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="drive_link">Link da Pasta (Drive)</Label>
                        <Input id="drive_link" type="url" {...register("drive_link")} placeholder="https://" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dashboard_link">Link do Dashboard</Label>
                        <Input id="dashboard_link" type="url" {...register("dashboard_link")} placeholder="https://" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="briefing_link">Link do Briefing</Label>
                        <Input id="briefing_link" type="url" {...register("briefing_link")} placeholder="https://" />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Criando..." : "Criar Funil"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
