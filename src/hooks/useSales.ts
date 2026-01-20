import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  default_commission_percent: number;
  price?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  external_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  product_id: string | null;
  product_name: string;
  total_value: number;
  installments_count: number;
  platform: string;
  seller_id: string;
  commission_percent: number;
  sale_date: string;
  status: 'active' | 'cancelled';
  proof_link: string | null;
  payment_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  seller?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Installment {
  id: string;
  sale_id: string;
  installment_number: number;
  total_installments: number;
  value: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  payment_date: string | null;
  external_installment_id?: string | null;
  created_at: string;
  updated_at: string;
  sale?: Sale;
}

export interface Commission {
  id: string;
  installment_id: string;
  seller_id: string;
  installment_value: number;
  commission_percent: number;
  commission_value: number;
  competence_month: string;
  status: 'pending' | 'released' | 'suspended' | 'cancelled';
  released_at: string | null;
  created_at: string;
  updated_at: string;
  installment?: Installment;
  seller?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CreateSaleInput {
  external_id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  product_id?: string;
  product_name: string;
  total_value: number;
  installments_count: number;
  platform: string;
  seller_id: string;
  commission_percent: number;
  sale_date: string;
  proof_link?: string;
}

// Products hooks
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useHotmartProducts() {
  return useQuery({
    queryKey: ['hotmart-products'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('hotmart-sync', {
        body: { action: 'get_products' },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fetch Hotmart products');
      
      return data.products as Array<{
        id: number;
        name: string;
        ucode?: string;
        status: string;
        price?: number;
      }>;
    },
  });
}

export function useSyncHotmartProducts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Fetch products from Hotmart
      const { data, error } = await supabase.functions.invoke('hotmart-sync', {
        body: { action: 'sync_products' },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to sync products');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Produtos sincronizados: ${data.created} criados, ${data.updated} atualizados`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao sincronizar produtos: ' + error.message);
    },
  });
}

export function useSyncHotmartInstallments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('hotmart-sync', {
        body: { action: 'sync_installments' },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Falha ao sincronizar parcelas');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success(`Parcelas sincronizadas: ${data.installments_updated} atualizadas`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao sincronizar parcelas: ' + error.message);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Partial<Product>, 'id' | 'created_at' | 'updated_at'> & { name: string }) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar produto: ' + error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar produto: ' + error.message);
    },
  });
}

// Sales hooks
export function useSales(sellerId?: string) {
  return useQuery({
    queryKey: ['sales', sellerId],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          seller:profiles!sales_seller_id_fkey(id, full_name, email)
        `)
        .order('sale_date', { ascending: false });
      
      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Sale[];
    },
  });
}

// Hook para vendas associadas (com vendedor atribuído - para controle de comissões)
export function useAssociatedSales(sellerId?: string) {
  return useQuery({
    queryKey: ['associated-sales', sellerId],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          seller:profiles!sales_seller_id_fkey(id, full_name, email)
        `)
        .not('seller_id', 'is', null)
        .order('sale_date', { ascending: false });
      
      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Sale[];
    },
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          seller:profiles!sales_seller_id_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Sale;
    },
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (saleError) throw saleError;
      
      // Generate installments
      const installmentValue = input.total_value / input.installments_count;
      const installments = [];
      const saleDate = new Date(input.sale_date);
      
      for (let i = 1; i <= input.installments_count; i++) {
        const dueDate = new Date(saleDate);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        
        installments.push({
          sale_id: sale.id,
          installment_number: i,
          total_installments: input.installments_count,
          value: installmentValue,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
        });
      }
      
      const { error: installmentsError } = await supabase
        .from('installments')
        .insert(installments);
      
      if (installmentsError) throw installmentsError;
      
      // Generate commissions for each installment
      const { data: createdInstallments } = await supabase
        .from('installments')
        .select('id, value, due_date')
        .eq('sale_id', sale.id);
      
      if (createdInstallments) {
        const commissions = createdInstallments.map(inst => {
          const dueDate = new Date(inst.due_date);
          const competenceMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
          
          return {
            installment_id: inst.id,
            seller_id: input.seller_id,
            installment_value: inst.value,
            commission_percent: input.commission_percent,
            commission_value: (inst.value * input.commission_percent) / 100,
            competence_month: competenceMonth.toISOString().split('T')[0],
            status: 'pending',
          };
        });
        
        await supabase.from('commissions').insert(commissions);
      }
      
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Venda cadastrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cadastrar venda: ' + error.message);
    },
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'cancelled' }) => {
      const { data, error } = await supabase
        .from('sales')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // If cancelled, update all installments and commissions
      if (status === 'cancelled') {
        await supabase
          .from('installments')
          .update({ status: 'cancelled' })
          .eq('sale_id', id);
        
        const { data: installments } = await supabase
          .from('installments')
          .select('id')
          .eq('sale_id', id);
        
        if (installments) {
          await supabase
            .from('commissions')
            .update({ status: 'cancelled' })
            .in('installment_id', installments.map(i => i.id));
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

export interface UpdateSaleInput {
  id: string;
  external_id?: string;
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  product_id?: string | null;
  product_name?: string;
  total_value?: number;
  platform?: string;
  seller_id?: string;
  commission_percent?: number;
  sale_date?: string;
  proof_link?: string | null;
  status?: 'active' | 'cancelled';
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSaleInput) => {
      const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // If status changed to cancelled, update installments and commissions
      if (updates.status === 'cancelled') {
        await supabase
          .from('installments')
          .update({ status: 'cancelled' })
          .eq('sale_id', id);
        
        const { data: installments } = await supabase
          .from('installments')
          .select('id')
          .eq('sale_id', id);
        
        if (installments) {
          await supabase
            .from('commissions')
            .update({ status: 'cancelled' })
            .in('installment_id', installments.map(i => i.id));
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Venda atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar venda: ' + error.message);
    },
  });
}

// Installments hooks
export function useInstallments(saleId?: string) {
  return useQuery({
    queryKey: ['installments', saleId],
    queryFn: async () => {
      let query = supabase
        .from('installments')
        .select(`
          *,
          sale:sales(
            id, external_id, client_name, product_name, platform, seller_id,
            seller:profiles!sales_seller_id_fkey(id, full_name, email)
          )
        `)
        .order('due_date', { ascending: true });
      
      if (saleId) {
        query = query.eq('sale_id', saleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as (Installment & { sale: Sale & { seller_id: string | null } })[];
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      payment_date 
    }: { 
      id: string; 
      status: Installment['status']; 
      payment_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('installments')
        .update({ status, payment_date })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update commission status based on installment status
      let commissionStatus: Commission['status'] = 'pending';
      if (status === 'paid') {
        commissionStatus = 'released';
      } else if (status === 'overdue') {
        commissionStatus = 'suspended';
      } else if (status === 'cancelled' || status === 'refunded') {
        commissionStatus = 'cancelled';
      }
      
      await supabase
        .from('commissions')
        .update({ 
          status: commissionStatus,
          released_at: status === 'paid' ? new Date().toISOString() : null,
        })
        .eq('installment_id', id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Parcela atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar parcela: ' + error.message);
    },
  });
}

// Commissions hooks
export function useCommissions(sellerId?: string, month?: string) {
  return useQuery({
    queryKey: ['commissions', sellerId, month],
    queryFn: async () => {
      let query = supabase
        .from('commissions')
        .select(`
          *,
          installment:installments(
            id, installment_number, total_installments, value, due_date, status, payment_date,
            sale:sales(id, external_id, client_name, product_name, platform)
          ),
          seller:profiles!commissions_seller_id_fkey(id, full_name, email)
        `)
        .order('competence_month', { ascending: false });
      
      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }
      
      if (month) {
        query = query.eq('competence_month', month);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Commission[];
    },
  });
}

export function useCommissionSummary(sellerId?: string) {
  return useQuery({
    queryKey: ['commission-summary', sellerId],
    queryFn: async () => {
      let query = supabase
        .from('commissions')
        .select('status, commission_value, competence_month');
      
      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      
      const summary = {
        totalReleased: 0,
        totalPending: 0,
        totalSuspended: 0,
        currentMonthReleased: 0,
        currentMonthPending: 0,
      };
      
      data?.forEach(comm => {
        if (comm.status === 'released') {
          summary.totalReleased += Number(comm.commission_value);
          if (comm.competence_month === currentMonth) {
            summary.currentMonthReleased += Number(comm.commission_value);
          }
        } else if (comm.status === 'pending') {
          summary.totalPending += Number(comm.commission_value);
          if (comm.competence_month === currentMonth) {
            summary.currentMonthPending += Number(comm.commission_value);
          }
        } else if (comm.status === 'suspended') {
          summary.totalSuspended += Number(comm.commission_value);
        }
      });
      
      return summary;
    },
  });
}

// CSV Import hooks
export function useCsvImports() {
  return useQuery({
    queryKey: ['csv-imports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csv_imports')
        .select(`
          *,
          imported_by_profile:profiles!csv_imports_imported_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCsvImport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (importData: {
      platform: string;
      filename: string;
      records: {
        external_id: string;
        installment_number: number;
        value: number;
        status: string;
        payment_date?: string;
      }[];
    }) => {
      let created = 0;
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const record of importData.records) {
        try {
          // Find sale by external_id
          const { data: sale } = await supabase
            .from('sales')
            .select('id')
            .eq('external_id', record.external_id)
            .single();
          
          if (!sale) {
            errors.push(`Venda ${record.external_id} não encontrada`);
            failed++;
            continue;
          }
          
          // Find or create installment
          const { data: existingInstallment } = await supabase
            .from('installments')
            .select('id')
            .eq('sale_id', sale.id)
            .eq('installment_number', record.installment_number)
            .single();
          
          const installmentStatus = record.status.toLowerCase() === 'pago' || record.status.toLowerCase() === 'paid' 
            ? 'paid' 
            : record.status.toLowerCase() === 'cancelado' || record.status.toLowerCase() === 'cancelled'
            ? 'cancelled'
            : record.status.toLowerCase() === 'estornado' || record.status.toLowerCase() === 'refunded'
            ? 'refunded'
            : 'pending';
          
          if (existingInstallment) {
            await supabase
              .from('installments')
              .update({ 
                status: installmentStatus,
                payment_date: record.payment_date || null,
              })
              .eq('id', existingInstallment.id);
            
            // Update commission
            let commissionStatus: Commission['status'] = 'pending';
            if (installmentStatus === 'paid') {
              commissionStatus = 'released';
            } else if (installmentStatus === 'cancelled' || installmentStatus === 'refunded') {
              commissionStatus = 'cancelled';
            }
            
            await supabase
              .from('commissions')
              .update({ 
                status: commissionStatus,
                released_at: installmentStatus === 'paid' ? new Date().toISOString() : null,
              })
              .eq('installment_id', existingInstallment.id);
            
            updated++;
          } else {
            created++;
          }
        } catch (err) {
          errors.push(`Erro ao processar ${record.external_id}: ${err}`);
          failed++;
        }
      }
      
      // Log import
      const { error } = await supabase
        .from('csv_imports')
        .insert({
          platform: importData.platform,
          filename: importData.filename,
          records_processed: importData.records.length,
          records_created: created,
          records_updated: updated,
          records_failed: failed,
          error_log: errors.length > 0 ? errors : null,
          imported_by: user?.id,
        });
      
      if (error) throw error;
      
      return { created, updated, failed, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['csv-imports'] });
      toast.success(`Importação concluída: ${result.updated} atualizados, ${result.created} criados, ${result.failed} falhas`);
    },
    onError: (error: Error) => {
      toast.error('Erro na importação: ' + error.message);
    },
  });
}
