import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Department {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export function useDepartments() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchDepartments = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast({
                title: 'Erro ao carregar departamentos',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const createDepartment = async (name: string, description?: string, color?: string) => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .insert({ name, description, color: color || '#6366f1' })
                .select()
                .single();

            if (error) throw error;

            toast({ title: 'Departamento criado com sucesso!' });
            await fetchDepartments();
            return data;
        } catch (error: any) {
            console.error('Error creating department:', error);
            toast({
                title: 'Erro ao criar departamento',
                description: error.message,
                variant: 'destructive',
            });
            return null;
        }
    };

    const updateDepartment = async (id: string, updates: Partial<Department>) => {
        try {
            const { error } = await supabase
                .from('departments')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'Departamento atualizado!' });
            await fetchDepartments();
            return true;
        } catch (error: any) {
            console.error('Error updating department:', error);
            toast({
                title: 'Erro ao atualizar departamento',
                description: error.message,
                variant: 'destructive',
            });
            return false;
        }
    };

    const deleteDepartment = async (id: string) => {
        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'Departamento removido!' });
            await fetchDepartments();
            return true;
        } catch (error: any) {
            console.error('Error deleting department:', error);
            toast({
                title: 'Erro ao remover departamento',
                description: error.message,
                variant: 'destructive',
            });
            return false;
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    return {
        departments,
        isLoading,
        fetchDepartments,
        createDepartment,
        updateDepartment,
        deleteDepartment,
    };
}
