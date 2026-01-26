import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchedSale {
  id: string;
  product_name: string;
  total_value: number;
  sale_date: string;
  client_name: string;
  matched_by: string; // nome do produto que fez o match
}

// Palavras a ignorar no matching (anos, conectores, etc.)
const IGNORED_WORDS = ['2023', '2024', '2025', '2026', '2027', '2028', 'mba', 'ciclo'];

// Função de match parcial - mesma lógica usada em useFunnelProducts
const matchesProductName = (saleName: string, productName: string): boolean => {
  const normalizedSale = saleName.toLowerCase().replace(/[\n\r\-–—]/g, ' ').replace(/\s+/g, ' ');
  const keywords = productName.toLowerCase()
    .replace(/[\n\r\-–—]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !IGNORED_WORDS.includes(word));
  
  // Se não sobrou nenhuma keyword relevante, não faz match
  if (keywords.length === 0) return false;
  
  return keywords.every(keyword => normalizedSale.includes(keyword));
};

export function useFunnelMatchedSales(funnelId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["funnel-matched-sales", funnelId, startDate, endDate],
    queryFn: async (): Promise<MatchedSale[]> => {
      // 1. Buscar produtos vinculados ao funil (cadastrados)
      const { data: funnelProducts, error: fpError } = await supabase
        .from("funnel_products")
        .select(`
          product_id,
          product:products(id, name)
        `)
        .eq("funnel_id", funnelId);

      if (fpError) throw fpError;

      // 2. Buscar produtos de vendas vinculados (Asaas manuais)
      const { data: salesProducts, error: spError } = await supabase
        .from("funnel_sales_products")
        .select("product_name")
        .eq("funnel_id", funnelId);

      if (spError) throw spError;

      const productIds = funnelProducts?.map((fp) => fp.product_id) || [];
      const productNamesFromCadastrados = (funnelProducts?.map((fp) => (fp.product as { name: string } | null)?.name).filter(Boolean) || []) as string[];
      const productNamesFromAsaas = (salesProducts?.map((sp) => sp.product_name).filter(Boolean) || []) as string[];

      // Todos os nomes de produtos para matching
      const allProductNames = [...productNamesFromCadastrados, ...productNamesFromAsaas];

      // Se não há produtos vinculados
      if (productIds.length === 0 && allProductNames.length === 0) {
        return [];
      }

      // 3. Buscar vendas
      let query = supabase
        .from("sales")
        .select("id, product_name, total_value, sale_date, client_name, product_id")
        .eq("status", "active");

      if (startDate) query = query.gte("sale_date", startDate);
      if (endDate) query = query.lte("sale_date", endDate);

      const { data: allSales, error: salesError } = await query.order("sale_date", { ascending: false });
      if (salesError) throw salesError;

      // 4. Filtrar e identificar qual produto fez o match
      const matchedSales: MatchedSale[] = [];

      allSales?.forEach((sale) => {
        if (!sale.product_name) return;

        // Match por product_id (exato)
        if (sale.product_id && productIds.includes(sale.product_id)) {
          const matchedProduct = funnelProducts?.find(fp => fp.product_id === sale.product_id);
          matchedSales.push({
            id: sale.id,
            product_name: sale.product_name,
            total_value: sale.total_value || 0,
            sale_date: sale.sale_date,
            client_name: sale.client_name,
            matched_by: (matchedProduct?.product as { name: string } | null)?.name || "Produto cadastrado",
          });
          return;
        }

        // Match por product_name (parcial)
        for (const pn of allProductNames) {
          if (matchesProductName(sale.product_name, pn)) {
            matchedSales.push({
              id: sale.id,
              product_name: sale.product_name,
              total_value: sale.total_value || 0,
              sale_date: sale.sale_date,
              client_name: sale.client_name,
              matched_by: pn,
            });
            return; // Só adiciona uma vez
          }
        }
      });

      return matchedSales;
    },
    enabled: !!funnelId,
  });
}