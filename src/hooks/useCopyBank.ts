import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface CopyBankItem {
  id: string;
  name: string;
  author_id: string | null;
  author_name: string;
  funnel_id: string | null;
  funnel_name: string | null;
  product_name: string | null;
  funnel_stage: string | null;
  channel: string;
  tags: string[];
  content: string;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCopyInput {
  name: string;
  author_id: string;
  author_name: string;
  funnel_id?: string | null;
  funnel_name?: string | null;
  product_name?: string | null;
  funnel_stage?: string | null;
  channel: string;
  tags?: string[];
  content: string;
  scheduled_for?: string | null;
}

export const COPY_BANK_KEY = "copy-bank";

export function useCopyBank(filters?: { 
  funnelId?: string; 
  channel?: string;
  search?: string;
}) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: [COPY_BANK_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("copy_bank")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.funnelId) {
        query = query.eq("funnel_id", filters.funnelId);
      }

      if (filters?.channel) {
        query = query.eq("channel", filters.channel);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching copy bank:", error);
        throw error;
      }

      return (data || []) as CopyBankItem[];
    },
    enabled: authReady && !!session,
  });
}

export function useCreateCopy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCopyInput) => {
      const { data, error } = await supabase
        .from("copy_bank")
        .insert({
          name: input.name,
          author_id: input.author_id,
          author_name: input.author_name,
          funnel_id: input.funnel_id || null,
          funnel_name: input.funnel_name || null,
          product_name: input.product_name || null,
          funnel_stage: input.funnel_stage || null,
          channel: input.channel,
          tags: input.tags || [],
          content: input.content,
          scheduled_for: input.scheduled_for || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CopyBankItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COPY_BANK_KEY] });
      toast.success("Copy salva no banco!");
    },
    onError: (error: Error) => {
      console.error("Error saving copy:", error);
      toast.error("Erro ao salvar copy");
    },
  });
}

export function useDeleteCopy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (copyId: string) => {
      const { error } = await supabase
        .from("copy_bank")
        .delete()
        .eq("id", copyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COPY_BANK_KEY] });
      toast.success("Copy removida do banco");
    },
    onError: (error: Error) => {
      console.error("Error deleting copy:", error);
      toast.error("Erro ao remover copy");
    },
  });
}

export function useUpdateCopy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateCopyInput> }) => {
      const { data, error } = await supabase
        .from("copy_bank")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CopyBankItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COPY_BANK_KEY] });
      toast.success("Copy atualizada");
    },
    onError: (error: Error) => {
      console.error("Error updating copy:", error);
      toast.error("Erro ao atualizar copy");
    },
  });
}
