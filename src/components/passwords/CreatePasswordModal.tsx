import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface CreatePasswordModalProps {
    onSuccess: () => void;
    editData?: any;
    open?: boolean;
    setOpen?: (open: boolean) => void;
}

interface FormData {
    nome_acesso: string;
    categoria: string;
    login_usuario: string;
    senha_criptografada: string;
    link_acesso: string;
    notas_adicionais: string;
}

const CATEGORIES = [
    "Ferramenta",
    "Curso",
    "Email",
    "Autenticador",
    "Outro"
];

export function CreatePasswordModal({ onSuccess, editData, open: externalOpen, setOpen: setExternalOpen }: CreatePasswordModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = setExternalOpen || setInternalOpen;

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
        defaultValues: editData || {
            nome_acesso: "",
            categoria: "Ferramenta",
            login_usuario: "",
            senha_criptografada: "",
            link_acesso: "",
            notas_adicionais: ""
        }
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("Você precisa estar logado para salvar acessos.");
                return;
            }

            if (editData) {
                const { error } = await supabase
                    .from("acessos_logins")
                    .update({
                        nome_acesso: data.nome_acesso,
                        categoria: data.categoria,
                        login_usuario: data.login_usuario,
                        senha_criptografada: data.senha_criptografada,
                        link_acesso: data.link_acesso || null,
                        notas_adicionais: data.notas_adicionais || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", editData.id);

                if (error) throw error;
                toast.success("Acesso atualizado com sucesso!");
            } else {
                const { error } = await supabase
                    .from("acessos_logins")
                    .insert({
                        nome_acesso: data.nome_acesso,
                        categoria: data.categoria,
                        login_usuario: data.login_usuario,
                        senha_criptografada: data.senha_criptografada,
                        link_acesso: data.link_acesso || null,
                        notas_adicionais: data.notas_adicionais || null,
                        created_by: user.id
                    });

                if (error) throw error;
                toast.success("Acesso criado com sucesso!");
            }

            setOpen(false);
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Error saving access:", error);
            toast.error("Erro ao salvar acesso: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!editData && (
                <DialogTrigger asChild>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Novo Acesso
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editData ? "Editar Acesso" : "Novo Acesso"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome_acesso">Nome do Login</Label>
                        <Input id="nome_acesso" {...register("nome_acesso", { required: "Nome é obrigatório" })} />
                        {errors.nome_acesso && <span className="text-xs text-red-500">{errors.nome_acesso.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="categoria">Categoria</Label>
                        <Controller
                            name="categoria"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger id="categoria">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="login_usuario">Usuário / Email</Label>
                            <Input id="login_usuario" {...register("login_usuario", { required: "Usuário é obrigatório" })} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="senha_criptografada">Senha</Label>
                        <Input
                            id="senha_criptografada"
                            type="text"
                            {...register("senha_criptografada", { required: "Senha é obrigatória" })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="link_acesso">Link de Acesso</Label>
                        <Input id="link_acesso" type="url" {...register("link_acesso")} placeholder="https://" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notas_adicionais">Notas Adicionais</Label>
                        <Input id="notas_adicionais" {...register("notas_adicionais")} />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Salvando..." : editData ? "Salvar Alterações" : "Criar Acesso"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
