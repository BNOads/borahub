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

export function useFunnelSalesProducts(funnelId: string) {
  return useQuery({
    queryKey: ["funnel-sales-products", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_sales_products")
        .select("id, funnel_id, product_name, created_at")
        .eq("funnel_id", funnelId);

      if (error) throw error;
      return (data || []).map(d => d.product_name);
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

export function useSalesProducts() {
  return useQuery({
    queryKey: ["sales-products-unique"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("product_name")
        .not("product_name", "is", null)
        .is("product_id", null);

      if (error) throw error;

      // Get unique product names
      const uniqueNames = [...new Set(
        (data || [])
          .map(s => s.product_name?.trim())
          .filter(Boolean)
      )].sort() as string[];

      return uniqueNames;
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

export function useAddFunnelSalesProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funnelId,
      productName,
    }: {
      funnelId: string;
      productName: string;
    }) => {
      const { error } = await supabase.from("funnel_sales_products").insert({
        funnel_id: funnelId,
        product_name: productName,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["funnel-sales-products", variables.funnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["funnel-revenue", variables.funnelId],
      });
      toast.success("Produto de vendas vinculado ao funil");
    },
    onError: (error: Error) => {
      console.error("Erro ao vincular produto de vendas:", error);
      toast.error("Erro ao vincular produto de vendas");
    },
  });
}

export function useRemoveFunnelSalesProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funnelId,
      productName,
    }: {
      funnelId: string;
      productName: string;
    }) => {
      const { error } = await supabase
        .from("funnel_sales_products")
        .delete()
        .eq("funnel_id", funnelId)
        .eq("product_name", productName);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["funnel-sales-products", variables.funnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["funnel-revenue", variables.funnelId],
      });
      toast.success("Produto de vendas removido do funil");
    },
    onError: (error: Error) => {
      console.error("Erro ao remover produto de vendas:", error);
      toast.error("Erro ao remover produto de vendas");
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
      // 1. Buscar produtos vinculados ao funil (com nome do produto)
      const { data: funnelProducts, error: fpError } = await supabase
        .from("funnel_products")
        .select(`
          product_id,
          product:products(id, name)
        `)
        .eq("funnel_id", funnelId);

      if (fpError) throw fpError;

      // 2. Buscar produtos de vendas vinculados (Asaas)
      const { data: salesProducts, error: spError } = await supabase
        .from("funnel_sales_products")
        .select("product_name")
        .eq("funnel_id", funnelId);

      if (spError) throw spError;

      const productIds = funnelProducts?.map((fp) => fp.product_id) || [];
      const productNames = [
        ...(funnelProducts?.map((fp) => (fp.product as { name: string } | null)?.name).filter(Boolean) as string[] || []),
        ...(salesProducts?.map((sp) => sp.product_name).filter(Boolean) || [])
      ];

      // Se não há produtos vinculados
      if (productIds.length === 0 && productNames.length === 0) {
        return { total: 0, count: 0, previousTotal: 0, previousCount: 0, growthPercent: 0 };
      }

      // 3. Buscar vendas do período atual (por product_id OU product_name)
      let currentQuery = supabase
        .from("sales")
        .select("id, total_value, sale_date, product_id, product_name")
        .eq("status", "active");

      if (startDate) currentQuery = currentQuery.gte("sale_date", startDate);
      if (endDate) currentQuery = currentQuery.lte("sale_date", endDate);

      const { data: allSales, error: currentError } = await currentQuery;
      if (currentError) throw currentError;

      // Palavras a ignorar no matching (anos, conectores, etc.)
      const IGNORED_WORDS = ['2023', '2024', '2025', '2026', '2027', '2028', 'mba', 'ciclo'];

      // Lógica de match parcial: verifica se TODAS as palavras-chave do produto
      // estão presentes no nome da venda (case-insensitive)
      // Normaliza quebras de linha, hífens e outros separadores
      const matchesProductName = (saleName: string, productName: string) => {
        // Normaliza removendo quebras de linha e caracteres especiais
        const normalizedSale = saleName.toLowerCase().replace(/[\n\r\-–—]/g, ' ').replace(/\s+/g, ' ');
        const keywords = productName.toLowerCase()
          .replace(/[\n\r\-–—]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2 && !IGNORED_WORDS.includes(word));
        
        // Se não sobrou nenhuma keyword relevante, não faz match
        if (keywords.length === 0) return false;
        
        return keywords.every(keyword => normalizedSale.includes(keyword));
      };

      // Filtrar vendas que correspondem aos produtos vinculados
      const currentSales = allSales?.filter((sale) => {
        // Match por product_id (exato)
        if (sale.product_id && productIds.includes(sale.product_id)) {
          return true;
        }
        // Match por product_name (parcial - contains)
        if (sale.product_name) {
          return productNames.some(pn => matchesProductName(sale.product_name!, pn));
        }
        return false;
      }) || [];

      const total = currentSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
      const count = currentSales.length;

      // 4. Calcular período anterior para comparação
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

        const { data: previousAllSales } = await supabase
          .from("sales")
          .select("id, total_value, product_id, product_name")
          .eq("status", "active")
          .gte("sale_date", previousStart.toISOString().split("T")[0])
          .lte("sale_date", previousEnd.toISOString().split("T")[0]);

        const previousSales = previousAllSales?.filter((sale) => {
          if (sale.product_id && productIds.includes(sale.product_id)) {
            return true;
          }
          if (sale.product_name) {
            return productNames.some(pn => matchesProductName(sale.product_name!, pn));
          }
          return false;
        }) || [];

        previousTotal = previousSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
        previousCount = previousSales.length;
      }

      const growthPercent = previousTotal > 0 
        ? Math.round(((total - previousTotal) / previousTotal) * 100) 
        : 0;

      return { total, count, previousTotal, previousCount, growthPercent };
    },
    enabled: !!funnelId,
  });
}
