import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const BOOK_STAGES = [
  { key: "venda", label: "Venda", color: "bg-blue-500" },
  { key: "pedido_bling", label: "Pedido Bling", color: "bg-purple-500" },
  { key: "etiqueta", label: "Etiqueta", color: "bg-orange-500" },
  { key: "enviado", label: "Enviado", color: "bg-emerald-500" },
  { key: "entregue", label: "Entregue", color: "bg-green-600" },
] as const;

export type BookStage = typeof BOOK_STAGES[number]["key"];

export interface BookShipment {
  id: string;
  sale_id: string | null;
  external_id: string | null;
  product_name: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  buyer_address: any;
  sale_date: string | null;
  sale_value: number | null;
  stage: BookStage;
  bling_order_id: string | null;
  tracking_code: string | null;
  label_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  bling_created_at: string | null;
  label_generated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookShipmentHistory {
  id: string;
  shipment_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export function useBookShipments() {
  return useQuery({
    queryKey: ["book-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_shipments" as any)
        .select("*")
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BookShipment[];
    },
  });
}

export function useBookShipmentHistory(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ["book-shipment-history", shipmentId],
    enabled: !!shipmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_shipment_history" as any)
        .select("*")
        .eq("shipment_id", shipmentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BookShipmentHistory[];
    },
  });
}

export function useUpdateShipmentStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shipmentId, newStage, trackingCode, labelUrl, notes }: {
      shipmentId: string;
      newStage: BookStage;
      trackingCode?: string;
      labelUrl?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("bling-sync", {
        body: { action: "update_stage", shipment_id: shipmentId, new_stage: newStage, tracking_code: trackingCode, label_url: labelUrl, notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-shipments"] });
      toast.success("Estágio atualizado");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useCreateBlingOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const { data, error } = await supabase.functions.invoke("bling-sync", {
        body: { action: "create_order", shipment_id: shipmentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-shipments"] });
      toast.success("Pedido criado no Bling");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useBlingConnection() {
  return useQuery({
    queryKey: ["bling-connection"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("bling-sync", {
        body: { action: "check_connection" },
      });
      if (error) return { connected: false, error: error.message };
      return data as { connected: boolean; error?: string };
    },
    staleTime: 60 * 1000,
  });
}

export function useBlingAuthorizeUrl() {
  return useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/livros`;
      const { data, error } = await supabase.functions.invoke("bling-sync", {
        body: { action: "get_authorize_url", redirect_uri: redirectUri },
      });
      if (error) throw error;
      return data as { url: string };
    },
  });
}

export function useBlingOAuthCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("bling-sync", {
        body: { action: "oauth_callback", code },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bling-connection"] });
      toast.success("Bling conectado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useBookProductAliases() {
  return useQuery({
    queryKey: ["book-product-aliases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_product_aliases" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as { id: string; alias: string; is_active: boolean; created_at: string }[];
    },
  });
}

export function useCreateAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alias: string) => {
      const { error } = await supabase
        .from("book_product_aliases" as any)
        .insert({ alias: alias.toLowerCase().trim() } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-product-aliases"] });
      toast.success("Alias adicionado");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("book_product_aliases" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-product-aliases"] });
      toast.success("Alias removido");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// Create a manual shipment
export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shipment: Partial<BookShipment>) => {
      const { error } = await supabase
        .from("book_shipments" as any)
        .insert(shipment as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-shipments"] });
      toast.success("Envio criado");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
