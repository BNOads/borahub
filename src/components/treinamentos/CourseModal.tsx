
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const courseSchema = z.object({
    title: z.string().min(1, "Título é obrigatório"),
    description: z.string().optional(),
    category: z.string().min(1, "Categoria é obrigatória"),
    level: z.string().min(1, "Nível é obrigatório"),
    thumbnail_url: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

interface CourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    course?: any;
    onSuccess: () => void;
}

export function CourseModal({ isOpen, onClose, course, onSuccess }: CourseModalProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            title: "",
            description: "",
            category: "",
            level: "",
            thumbnail_url: "",
        },
    });

    useEffect(() => {
        if (course) {
            form.reset({
                title: course.title,
                description: course.description || "",
                category: course.category,
                level: course.level,
                thumbnail_url: course.thumbnail_url || "",
            });
        } else {
            form.reset({
                title: "",
                description: "",
                category: "",
                level: "",
                thumbnail_url: "",
            });
        }
    }, [course, form, isOpen]);

    async function onSubmit(values: CourseFormValues) {
        try {
            setLoading(true);
            if (course) {
                const { error } = await supabase
                    .from("courses")
                    .update({
                        ...values,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", course.id);
                if (error) throw error;
                toast.success("Curso atualizado com sucesso!");
            } else {
                const { error } = await supabase
                    .from("courses")
                    .insert([{ ...values, title: values.title }]);
                if (error) throw error;
                toast.success("Curso criado com sucesso!");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error("Erro ao salvar curso: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {course ? "Editar Curso" : "Novo Curso"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Tráfego para Iniciantes" {...field} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Sobre o curso" {...field} className="rounded-xl min-h-[100px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoria</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                                                <SelectItem value="Processos">Processos</SelectItem>
                                                <SelectItem value="Vendas">Vendas</SelectItem>
                                                <SelectItem value="Tráfego">Tráfego</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="level"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nível</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Iniciante">Iniciante</SelectItem>
                                                <SelectItem value="Intermediário">Intermediário</SelectItem>
                                                <SelectItem value="Avançado">Avançado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="thumbnail_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Thumbnail URL (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://..." {...field} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="rounded-xl bg-accent hover:bg-accent/90">
                                {loading ? "Salvando..." : "Salvar Curso"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
