import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FunnelProduct {
  id: string;
  funnel_id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    price: number | null;
    is_active: boolean | null;
  };
}

export interface RevenueData {
  total: number;
  count: number;
  previousTotal: number;
  previousCount: number;
  growthPercent: number;
}

export function useFunnelProducts(funnelId: string) {
  return useQuery({
    queryKey: ["funnel-products", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_products")
        .select(`
          id,
          funnel_id,
          product_id,
          created_at,
          product:products(id, name, price, is_active)
        `)
        .eq("funnel_id", funnelId);

      if (error) throw error;
      return (data || []) as unknown as FunnelProduct[];
    },
    enabled: !!funnelId,
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddFunnelProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funnelId,
      productId,
    }: {
      funnelId: string;
      productId: string;
    }) => {
      const { error } = await supabase.from("funnel_products").insert({
        funnel_id: funnelId,
        product_id: productId,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["funnel-products", variables.funnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["funnel-revenue", variables.funnelId],
      });
      toast.success("Produto vinculado ao funil");
    },
    onError: (error: Error) => {
      console.error("Erro ao vincular produto:", error);
      toast.error("Erro ao vincular produto");
    },
  });
}

export function useRemoveFunnelProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funnelId,
      productId,
    }: {
      funnelId: string;
      productId: string;
    }) => {
      const { error } = await supabase
        .from("funnel_products")
        .delete()
        .eq("funnel_id", funnelId)
        .eq("product_id", productId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["funnel-products", variables.funnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["funnel-revenue", variables.funnelId],
      });
      toast.success("Produto removido do funil");
    },
    onError: (error: Error) => {
      console.error("Erro ao remover produto:", error);
      toast.error("Erro ao remover produto");
    },
  });
}

export function useFunnelRevenue(
  funnelId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ["funnel-revenue", funnelId, startDate, endDate],
    queryFn: async (): Promise<RevenueData> => {
      // 1. Buscar product_ids vinculados ao funil
      const { data: funnelProducts, error: fpError } = await supabase
        .from("funnel_products")
        .select("product_id")
        .eq("funnel_id", funnelId);

      if (fpError) throw fpError;

      const productIds = funnelProducts?.map((fp) => fp.product_id) || [];
      if (!productIds.length) {
        return { total: 0, count: 0, previousTotal: 0, previousCount: 0, growthPercent: 0 };
      }

      // 2. Buscar vendas do período atual
      let currentQuery = supabase
        .from("sales")
        .select("id, total_value, sale_date")
        .in("product_id", productIds)
        .eq("status", "active");

      if (startDate) currentQuery = currentQuery.gte("sale_date", startDate);
      if (endDate) currentQuery = currentQuery.lte("sale_date", endDate);

      const { data: currentSales, error: currentError } = await currentQuery;
      if (currentError) throw currentError;

      const total = currentSales?.reduce((sum, s) => sum + (s.total_value || 0), 0) || 0;
      const count = currentSales?.length || 0;

      // 3. Calcular período anterior para comparação
      let previousTotal = 0;
      let previousCount = 0;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        const previousEnd = new Date(start);
        previousEnd.setDate(previousEnd.getDate() - 1);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousStart.getDate() - periodDays);

        const { data: previousSales } = await supabase
          .from("sales")
          .select("id, total_value")
          .in("product_id", productIds)
          .eq("status", "active")
          .gte("sale_date", previousStart.toISOString().split("T")[0])
          .lte("sale_date", previousEnd.toISOString().split("T")[0]);

        previousTotal = previousSales?.reduce((sum, s) => sum + (s.total_value || 0), 0) || 0;
        previousCount = previousSales?.length || 0;
      }

      const growthPercent = previousTotal > 0 
        ? Math.round(((total - previousTotal) / previousTotal) * 100) 
        : 0;

      return { total, count, previousTotal, previousCount, growthPercent };
    },
    enabled: !!funnelId,
  });
}
