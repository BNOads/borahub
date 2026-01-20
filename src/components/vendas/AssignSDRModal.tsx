import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSalesWithoutSDR, useCreateSDRAssignment } from "@/hooks/useSDR";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  sale_id: z.string().min(1, "Selecione uma venda"),
  sdr_id: z.string().min(1, "Selecione o SDR"),
  proof_link: z.string().url("Digite uma URL válida").min(1, "Link de comprovação obrigatório"),
  commission_percent: z.coerce.number().min(0.1).max(100).default(1),
});

type FormData = z.infer<typeof formSchema>;

interface AssignSDRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignSDRModal({ open, onOpenChange }: AssignSDRModalProps) {
  const { user } = useAuth();
  const { data: salesWithoutSDR, isLoading: loadingSales } = useSalesWithoutSDR();
  const createAssignment = useCreateSDRAssignment();

  // Fetch active users for SDR selection
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sale_id: "",
      sdr_id: "",
      proof_link: "",
      commission_percent: 1,
    },
  });

  const onSubmit = async (data: FormData) => {
    await createAssignment.mutateAsync({
      sale_id: data.sale_id,
      sdr_id: data.sdr_id,
      proof_link: data.proof_link,
      commission_percent: data.commission_percent,
      created_by: user?.id,
    });
    form.reset();
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atribuir SDR / Setter</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sale_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venda</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingSales ? "Carregando..." : "Selecione a venda"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salesWithoutSDR?.map((sale) => (
                        <SelectItem key={sale.id} value={sale.id}>
                          <span className="font-mono text-xs">{sale.external_id}</span>
                          <span className="mx-2">-</span>
                          <span>{sale.client_name}</span>
                          <span className="mx-2 text-muted-foreground">
                            ({formatCurrency(sale.total_value)})
                          </span>
                        </SelectItem>
                      ))}
                      {salesWithoutSDR?.length === 0 && (
                        <SelectItem value="none" disabled>
                          Nenhuma venda disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sdr_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SDR / Setter</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingUsers ? "Carregando..." : "Selecione o SDR"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}
                          <span className="ml-2 text-muted-foreground text-xs">
                            ({u.email})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proof_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link de Comprovação</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commission_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentual de Comissão (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createAssignment.isPending}>
                {createAssignment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Atribuir SDR
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
