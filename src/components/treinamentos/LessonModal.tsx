
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const lessonSchema = z.object({
    title: z.string().min(1, "Título é obrigatório"),
    description: z.string().optional(),
    video_url: z.string().url("URL de vídeo inválida").or(z.literal("")),
    duration: z.string().optional(),
    order_index: z.coerce.number().default(0),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    lesson?: any;
    onSuccess: () => void;
}

export function LessonModal({ isOpen, onClose, courseId, lesson, onSuccess }: LessonModalProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<LessonFormValues>({
        resolver: zodResolver(lessonSchema),
        defaultValues: {
            title: "",
            description: "",
            video_url: "",
            duration: "",
            order_index: 0,
        },
    });

    useEffect(() => {
        if (lesson) {
            form.reset({
                title: lesson.title,
                description: lesson.description || "",
                video_url: lesson.video_url || "",
                duration: lesson.duration || "",
                order_index: lesson.order_index || 0,
            });
        } else {
            form.reset({
                title: "",
                description: "",
                video_url: "",
                duration: "",
                order_index: 0,
            });
        }
    }, [lesson, form, isOpen]);

    async function onSubmit(values: LessonFormValues) {
        try {
            setLoading(true);
            if (lesson) {
                const { error } = await supabase
                    .from("lessons")
                    .update({
                        title: values.title,
                        description: values.description,
                        video_url: values.video_url || null,
                        duration: values.duration || null,
                        order_index: values.order_index,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", lesson.id);
                if (error) throw error;
                toast.success("Aula atualizada com sucesso!");
            } else {
                const { error } = await supabase
                    .from("lessons")
                    .insert([{
                        title: values.title,
                        description: values.description,
                        video_url: values.video_url || null,
                        duration: values.duration || null,
                        order_index: values.order_index,
                        course_id: courseId,
                    }]);
                if (error) throw error;
                toast.success("Aula criada com sucesso!");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error("Erro ao salvar aula: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {lesson ? "Editar Aula" : "Nova Aula"}
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
                                        <Input placeholder="Ex: Introdução ao curso" {...field} className="rounded-xl" />
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
                                        <Textarea placeholder="Resumo do que será ensinado" {...field} className="rounded-xl min-h-[100px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="video_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL do Vídeo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="YouTube/Vimeo link" {...field} className="rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duração</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 15:00" {...field} className="rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="order_index"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ordem</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} className="rounded-xl" />
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
                                {loading ? "Salvando..." : "Salvar Aula"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
