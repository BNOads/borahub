import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { FunnelData } from "../funnel-panel/types";

interface EditFunnelModalProps {
  funnel: FunnelData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFunnelUpdated: () => void;
}

interface FormData {
  name: string;
  code: string;
  product_name: string;
  category: string;
  predicted_investment: number;
  drive_link: string;
  dashboard_link: string;
  briefing_link: string;
  status: string;
}

const CATEGORIES = [
  "E-book",
  "High ticket",
  "low-ticket",
  "Lançamento",
  "Meteórico",
  "Reabertura",
  "Evento presencial",
];

const STATUSES = [
  { value: "active", label: "Em Captação" },
  { value: "finished", label: "Finalizado" },
  { value: "archived", label: "Arquivado" },
];

export function EditFunnelModal({
  funnel,
  open,
  onOpenChange,
  onFunnelUpdated,
}: EditFunnelModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [displayInvestment, setDisplayInvestment] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    if (open && funnel) {
      reset({
        name: funnel.name || "",
        code: funnel.code || "",
        product_name: funnel.product_name || "",
        category: funnel.category || "",
        predicted_investment: funnel.predicted_investment || 0,
        drive_link: funnel.drive_link || "",
        dashboard_link: funnel.dashboard_link || "",
        briefing_link: funnel.briefing_link || "",
        status: funnel.status || "active",
      });
      if (funnel.predicted_investment) {
        setDisplayInvestment(
          new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(funnel.predicted_investment)
        );
      } else {
        setDisplayInvestment("");
      }
    }
  }, [open, funnel, reset]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    const amount = parseFloat(numericValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setDisplayInvestment(formattedValue);
    const numericStr = rawValue.replace(/\D/g, "");
    const numericValue = numericStr ? parseFloat(numericStr) / 100 : 0;
    setValue("predicted_investment", numericValue);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      let investment = 0;
      if (data.predicted_investment) {
        const parsed = parseFloat(String(data.predicted_investment));
        if (!isNaN(parsed)) {
          investment = parsed;
        }
      }

      const { error } = await supabase
        .from("funnels")
        .update({
          name: data.name,
          code: data.code || null,
          product_name: data.product_name || null,
          category: data.category || null,
          predicted_investment: investment,
          drive_link: data.drive_link || null,
          dashboard_link: data.dashboard_link || null,
          briefing_link: data.briefing_link || null,
          status: data.status,
        })
        .eq("id", funnel.id);

      if (error) throw error;

      toast.success("Funil atualizado com sucesso!");
      onOpenChange(false);
      onFunnelUpdated();
    } catch (error: any) {
      console.error("Error updating funnel:", error);
      toast.error(`Erro ao atualizar funil: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Funil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Funil</Label>
              <Input
                id="name"
                {...register("name", { required: "Nome é obrigatório" })}
              />
              {errors.name && (
                <span className="text-xs text-destructive">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" {...register("code")} placeholder="Ex: L01" />
            </div>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_investment">Investimento Previsto</Label>
              <Input
                id="display_investment"
                placeholder="R$ 0,00"
                value={displayInvestment}
                onChange={handleInvestmentChange}
              />
              <input type="hidden" {...register("predicted_investment")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drive_link">Link da Pasta (Drive)</Label>
            <Input
              id="drive_link"
              type="url"
              {...register("drive_link")}
              placeholder="https://"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard_link">Link do Dashboard</Label>
            <Input
              id="dashboard_link"
              type="url"
              {...register("dashboard_link")}
              placeholder="https://"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="briefing_link">Link do Briefing</Label>
            <Input
              id="briefing_link"
              type="url"
              {...register("briefing_link")}
              placeholder="https://"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
