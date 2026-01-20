import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SDRAssignment {
  id: string;
  sale_id: string;
  sdr_id: string;
  proof_link: string;
  commission_percent: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sale?: {
    external_id: string;
    client_name: string;
    product_name: string;
    total_value: number;
    seller_id: string | null;
  };
  sdr?: {
    id: string;
    full_name: string;
    email: string;
  };
  approver?: {
    full_name: string;
  };
}

export interface SDRCommission {
  id: string;
  sdr_assignment_id: string;
  installment_id: string;
  sdr_id: string;
  installment_value: number;
  commission_percent: number;
  commission_value: number;
  competence_month: string;
  status: 'pending' | 'released' | 'suspended' | 'cancelled';
  released_at: string | null;
  created_at: string;
  // Joined data
  sdr?: {
    id: string;
    full_name: string;
  };
  installment?: {
    installment_number: number;
    total_installments: number;
    due_date: string;
    status: string;
  };
  assignment?: {
    sale?: {
      external_id: string;
      client_name: string;
      product_name: string;
    };
  };
}

// Fetch all SDR assignments
export function useSDRAssignments(status?: string) {
  return useQuery({
    queryKey: ['sdr-assignments', status],
    queryFn: async () => {
      let query = supabase
        .from('sdr_assignments')
        .select(`
          *,
          sale:sales(external_id, client_name, product_name, total_value, seller_id),
          sdr:profiles!sdr_assignments_sdr_id_fkey(id, full_name, email),
          approver:profiles!sdr_assignments_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SDRAssignment[];
    },
  });
}

// Fetch SDR assignment for a specific sale
export function useSDRAssignmentBySale(saleId: string) {
  return useQuery({
    queryKey: ['sdr-assignment-sale', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdr_assignments')
        .select(`
          *,
          sdr:profiles!sdr_assignments_sdr_id_fkey(id, full_name, email)
        `)
        .eq('sale_id', saleId)
        .maybeSingle();

      if (error) throw error;
      return data as SDRAssignment | null;
    },
    enabled: !!saleId,
  });
}

// Create SDR assignment
export function useCreateSDRAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sale_id: string;
      sdr_id: string;
      proof_link: string;
      commission_percent?: number;
      created_by?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('sdr_assignments')
        .insert({
          sale_id: data.sale_id,
          sdr_id: data.sdr_id,
          proof_link: data.proof_link,
          commission_percent: data.commission_percent || 1,
          created_by: data.created_by,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-assignments'] });
      toast.success('SDR atribuído com sucesso! Aguardando aprovação.');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Esta venda já possui um SDR atribuído.');
      } else {
        toast.error('Erro ao atribuir SDR: ' + error.message);
      }
    },
  });
}

// Approve SDR assignment and generate commissions
export function useApproveSDRAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      approvedBy 
    }: { 
      assignmentId: string; 
      approvedBy: string;
    }) => {
      // 1. Get the assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('sdr_assignments')
        .select('*, sale:sales(*)')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // 2. Update assignment status
      const { error: updateError } = await supabase
        .from('sdr_assignments')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      // 3. Get all installments for this sale
      const { data: installments, error: installmentsError } = await supabase
        .from('installments')
        .select('*')
        .eq('sale_id', assignment.sale_id)
        .order('installment_number');

      if (installmentsError) throw installmentsError;

      // 4. Create SDR commissions for each installment
      const commissions = installments.map(inst => {
        const commissionValue = Number(inst.value) * (assignment.commission_percent / 100);
        const competenceMonth = inst.due_date.substring(0, 7) + '-01'; // First day of month

        return {
          sdr_assignment_id: assignmentId,
          installment_id: inst.id,
          sdr_id: assignment.sdr_id,
          installment_value: inst.value,
          commission_percent: assignment.commission_percent,
          commission_value: commissionValue,
          competence_month: competenceMonth,
          status: inst.status === 'paid' ? 'released' : 'pending',
          released_at: inst.status === 'paid' ? new Date().toISOString() : null,
        };
      });

      if (commissions.length > 0) {
        const { error: commissionsError } = await supabase
          .from('sdr_commissions')
          .insert(commissions);

        if (commissionsError) throw commissionsError;
      }

      return { assignment, commissionsCreated: commissions.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-commissions'] });
      toast.success(`SDR aprovado! ${result.commissionsCreated} comissões geradas.`);
    },
    onError: (error: any) => {
      toast.error('Erro ao aprovar SDR: ' + error.message);
    },
  });
}

// Reject SDR assignment
export function useRejectSDRAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      rejectionReason 
    }: { 
      assignmentId: string; 
      rejectionReason: string;
    }) => {
      const { error } = await supabase
        .from('sdr_assignments')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-assignments'] });
      toast.success('SDR rejeitado.');
    },
    onError: (error: any) => {
      toast.error('Erro ao rejeitar SDR: ' + error.message);
    },
  });
}

// Delete SDR assignment (only pending)
export function useDeleteSDRAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('sdr_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-assignments'] });
      toast.success('Atribuição de SDR removida.');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover atribuição: ' + error.message);
    },
  });
}

// Fetch SDR commissions
export function useSDRCommissions(sdrId?: string, month?: string) {
  return useQuery({
    queryKey: ['sdr-commissions', sdrId, month],
    queryFn: async () => {
      let query = supabase
        .from('sdr_commissions')
        .select(`
          *,
          sdr:profiles!sdr_commissions_sdr_id_fkey(id, full_name),
          installment:installments(installment_number, total_installments, due_date, status)
        `)
        .order('created_at', { ascending: false });

      if (sdrId) {
        query = query.eq('sdr_id', sdrId);
      }

      if (month) {
        query = query.eq('competence_month', month + '-01');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SDRCommission[];
    },
  });
}

// SDR Commission Summary
export function useSDRCommissionSummary(sdrId?: string) {
  return useQuery({
    queryKey: ['sdr-commission-summary', sdrId],
    queryFn: async () => {
      let query = supabase
        .from('sdr_commissions')
        .select('*');

      if (sdrId) {
        query = query.eq('sdr_id', sdrId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const summary = {
        totalReleased: 0,
        totalPending: 0,
        totalSuspended: 0,
        totalCancelled: 0,
        count: data?.length || 0,
      };

      data?.forEach(comm => {
        const value = Number(comm.commission_value);
        switch (comm.status) {
          case 'released':
            summary.totalReleased += value;
            break;
          case 'pending':
            summary.totalPending += value;
            break;
          case 'suspended':
            summary.totalSuspended += value;
            break;
          case 'cancelled':
            summary.totalCancelled += value;
            break;
        }
      });

      return summary;
    },
  });
}

// Update SDR commission status when installment is paid
export function useUpdateSDRCommissionOnInstallmentPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (installmentId: string) => {
      const { error } = await supabase
        .from('sdr_commissions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('installment_id', installmentId)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-commissions'] });
    },
  });
}

// Fetch sales available for SDR assignment (with seller, no SDR yet)
export function useSalesWithoutSDR() {
  return useQuery({
    queryKey: ['sales-without-sdr'],
    queryFn: async () => {
      // Get all sales with seller assigned
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, external_id, client_name, product_name, total_value, seller_id, sale_date')
        .not('seller_id', 'is', null)
        .eq('status', 'active')
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      // Get all existing SDR assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('sdr_assignments')
        .select('sale_id');

      if (assignmentsError) throw assignmentsError;

      const assignedSaleIds = new Set(assignments?.map(a => a.sale_id));

      // Filter out sales that already have SDR
      return sales?.filter(sale => !assignedSaleIds.has(sale.id)) || [];
    },
  });
}
