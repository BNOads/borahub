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
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

const linkSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    url: z.string().url("URL inválida"),
    description: z.string().optional(),
    category: z.string().min(1, "Categoria é obrigatória"),
    favicon: z.string().optional(),
});

type LinkFormValues = z.infer<typeof linkSchema>;

interface LinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    link?: any;
    onSuccess: () => void;
}

const categories = ["Geral", "Produtividade", "Armazenamento", "Design", "Marketing", "Análise", "Vendas"];

export function LinkModal({ isOpen, onClose, link, onSuccess }: LinkModalProps) {
    const form = useForm<LinkFormValues>({
        resolver: zodResolver(linkSchema),
        defaultValues: {
            name: "",
            url: "",
            description: "",
            category: "Geral",
            favicon: "",
        },
    });

    useEffect(() => {
        if (link) {
            form.reset({
                name: link.name,
                url: link.url,
                description: link.description || "",
                category: link.category || "Geral",
                favicon: link.favicon || "",
            });
        } else {
            form.reset({
                name: "",
                url: "",
                description: "",
                category: "Geral",
                favicon: "",
            });
        }
    }, [link, form, isOpen]);

    async function onSubmit(values: LinkFormValues) {
        try {
            if (link) {
                const { error } = await supabase
                    .from("links")
                    .update(values)
                    .eq("id", link.id);
                if (error) throw error;
                toast.success("Link atualizado com sucesso!");
            } else {
                const { error } = await supabase
                    .from("links")
                    .insert([values]);
                if (error) throw error;
                toast.success("Link criado com sucesso!");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error("Erro ao salvar link: " + error.message);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle>{link ? "Editar Link" : "Novo Link"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Trello" {...field} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://..." {...field} className="rounded-xl" />
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
                                        <Input placeholder="Breve descrição" {...field} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoria</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue placeholder="Selecione uma categoria" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="favicon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ícone (Letra ou Emoji)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: T" {...field} maxLength={2} className="rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" className="w-full rounded-xl bg-accent hover:bg-accent/90">
                                {link ? "Salvar Alterações" : "Criar Link"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
