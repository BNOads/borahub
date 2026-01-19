import { useEffect, useState } from "react";
import {
    Search,
    ExternalLink,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Key,
    Lock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreatePasswordModal } from "@/components/passwords/CreatePasswordModal";
import { useAuth } from "@/contexts/AuthContext";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Acesso {
    id: string;
    nome_acesso: string;
    categoria: string;
    login_usuario: string;
    senha_criptografada: string;
    link_acesso: string | null;
    notas_adicionais: string | null;
    created_at: string;
}

const categoryColors: Record<string, string> = {
    Ferramenta: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Curso: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    Email: "bg-green-500/10 text-green-500 border-green-500/20",
    Autenticador: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    plataforma_cursos: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    ferramentas_ads: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    redes_sociais: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    analytics: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    outros: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    Outro: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const categoryLabels: Record<string, string> = {
    Ferramenta: "Ferramenta",
    Curso: "Curso",
    Email: "Email",
    Autenticador: "Autenticador",
    plataforma_cursos: "Plataforma de Cursos",
    ferramentas_ads: "Ferramentas de Ads",
    redes_sociais: "Redes Sociais",
    analytics: "Analytics",
    outros: "Outros",
    Outro: "Outro",
};

export default function Senhas() {
    const { isAdmin } = useAuth();
    const [acessos, setAcessos] = useState<Acesso[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    // Edit state
    const [editingAcesso, setEditingAcesso] = useState<Acesso | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Get unique categories from data
    const uniqueCategories = [...new Set(acessos.map(a => a.categoria))];

    const fetchAcessos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("acessos_logins")
                .select("*")
                .order("nome_acesso", { ascending: true });

            if (error) throw error;
            setAcessos(data || []);
        } catch (error: any) {
            console.error("Error fetching acessos:", error);
            toast.error("Erro ao carregar acessos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAcessos();
    }, []);

    const togglePasswordVisibility = (id: string) => {
        setShowPasswords(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            const { error } = await supabase
                .from("acessos_logins")
                .delete()
                .eq("id", deletingId);

            if (error) throw error;
            toast.success("Acesso excluído com sucesso!");
            setAcessos(acessos.filter(a => a.id !== deletingId));
        } catch (error: any) {
            console.error("Error deleting acesso:", error);
            toast.error("Erro ao excluir acesso");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (acesso: Acesso) => {
        setEditingAcesso(acesso);
        setIsEditModalOpen(true);
    };

    const filteredAcessos = acessos.filter((acesso) => {
        const matchesSearch = 
            acesso.nome_acesso.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acesso.login_usuario.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acesso.categoria.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = selectedCategory === "all" || acesso.categoria === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Lock className="h-8 w-8 text-accent" />
                        Senhas Úteis
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie credenciais e acessos da equipe de forma centralizada
                    </p>
                </div>
                {isAdmin && <CreatePasswordModal onSuccess={fetchAcessos} />}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou usuário..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory("all")}
                        className={selectedCategory === "all" ? "bg-accent hover:bg-accent/90" : ""}
                    >
                        Todos ({acessos.length})
                    </Button>
                    {uniqueCategories.map((cat) => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory(cat)}
                            className={selectedCategory === cat ? "bg-accent hover:bg-accent/90" : ""}
                        >
                            {categoryLabels[cat] || cat} ({acessos.filter(a => a.categoria === cat).length})
                        </Button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Nome do Login</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Senha</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                                        Carregando...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredAcessos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    Nenhum acesso encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAcessos.map((acesso) => (
                                <TableRow key={acesso.id} className="group">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded bg-accent/10">
                                                <Key className="h-4 w-4 text-accent" />
                                            </div>
                                            {acesso.nome_acesso}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={categoryColors[acesso.categoria] || categoryColors.Outro}>
                                            {categoryLabels[acesso.categoria] || acesso.categoria}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {acesso.login_usuario}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono min-w-[120px]">
                                                {showPasswords[acesso.id] ? acesso.senha_criptografada : "••••••••••••"}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => togglePasswordVisibility(acesso.id)}
                                            >
                                                {showPasswords[acesso.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {acesso.link_acesso && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-accent"
                                                    onClick={() => window.open(acesso.link_acesso!, "_blank")}
                                                    title="Abrir Link"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-500"
                                                onClick={() => handleEdit(acesso)}
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => setDeletingId(acesso.id)}
                                                title="Excluir"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Modal */}
            {editingAcesso && (
                <CreatePasswordModal
                    open={isEditModalOpen}
                    setOpen={setIsEditModalOpen}
                    editData={editingAcesso}
                    onSuccess={fetchAcessos}
                />
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O acesso será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
