
import { useState, useEffect, useRef } from "react";
import { Search, Plus, Star, StarOff, MoreVertical, Share2, Trash2, Globe, Lock, ChevronLeft, Save, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from "@/contexts/AuthContext";

interface Document {
    id: string;
    title: string;
    content: string;
    icon: string;
    is_favorite: boolean;
    is_public: boolean;
    slug: string;
    category: string;
    updated_at: string;
}

export default function GuiaView() {
    const { isAdmin } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Local state for debouncing
    const [localTitle, setLocalTitle] = useState("");
    const [localContent, setLocalContent] = useState("");
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    useEffect(() => {
        if (selectedDoc) {
            setLocalTitle(selectedDoc.title);
            setLocalContent(selectedDoc.content);
        }
    }, [selectedDoc?.id]);

    async function fetchDocuments() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .order("updated_at", { ascending: false });

            if (error) throw error;
            setDocuments(data || []);

            if (data && data.length > 0 && !selectedDoc) {
                setSelectedDoc(data[0]);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    }

    const createDocument = async () => {
        try {
            const { data, error } = await supabase
                .from("documents")
                .insert([{ title: "Novo Documento", content: "", icon: "📄" }])
                .select()
                .single();

            if (error) throw error;
            toast.success("Documento criado!");
            fetchDocuments();
            setSelectedDoc(data);
        } catch (error: any) {
            toast.error("Erro ao criar documento: " + error.message);
        }
    };

    const performSave = async (id: string, updates: Partial<Document>) => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from("documents")
                .update(updates)
                .eq("id", id);

            if (error) throw error;

            setDocuments(docs => docs.map(d => d.id === id ? { ...d, ...updates } : d));
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const debouncedSave = (id: string, updates: Partial<Document>) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            performSave(id, updates);
        }, 2000); // 2 seconds debounce
    };

    const updateDocumentImmediately = async (id: string, updates: Partial<Document>) => {
        // For title, content, we debounce. For status (favorite, public, icon), we update immediately.
        await performSave(id, updates);
        if (selectedDoc?.id === id) {
            setSelectedDoc({ ...selectedDoc, ...updates });
        }
    };

    const deleteDocument = async (id: string) => {
        if (!confirm("Excluir este documento?")) return;
        try {
            const { error } = await supabase
                .from("documents")
                .delete()
                .eq("id", id);
            if (error) throw error;
            toast.success("Documento excluído");
            if (selectedDoc?.id === id) setSelectedDoc(null);
            fetchDocuments();
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
        }
    };

    const copyPublicLink = (slug: string) => {
        const url = `${window.location.origin}/p/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("Link público copiado!");
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const favoriteDocs = filteredDocs.filter(d => d.is_favorite);
    const otherDocs = filteredDocs.filter(d => !d.is_favorite);

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-card/30 rounded-3xl border border-border overflow-hidden animate-fade-in">
            {/* Sidebar */}
            <div className="w-80 border-r border-border flex flex-col bg-card/50">
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg">Arquivos</h2>
                        {isAdmin && (
                            <Button size="icon" variant="ghost" className="rounded-xl" onClick={createDocument}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            className="pl-9 h-9 rounded-xl bg-background/50 border-accent/10 focus-visible:ring-accent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 px-2">
                    <div className="space-y-6 p-2">
                        {favoriteDocs.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">Favoritos</p>
                                {favoriteDocs.map(doc => (
                                    <DocListItem
                                        key={doc.id}
                                        doc={doc}
                                        active={selectedDoc?.id === doc.id}
                                        onClick={() => setSelectedDoc(doc)}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">Documentos</p>
                            {otherDocs.map(doc => (
                                <DocListItem
                                    key={doc.id}
                                    doc={doc}
                                    active={selectedDoc?.id === doc.id}
                                    onClick={() => setSelectedDoc(doc)}
                                />
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-background/20">
                {selectedDoc ? (
                    <>
                        {/* Editor Toolbar */}
                        <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card/30 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">{selectedDoc.icon}</span>
                                <Input
                                    value={localTitle}
                                    onChange={(e) => {
                                        setLocalTitle(e.target.value);
                                        debouncedSave(selectedDoc.id, { title: e.target.value });
                                    }}
                                    className="border-none bg-transparent font-bold text-lg p-0 focus-visible:ring-0 w-64"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("rounded-xl h-9 w-9", selectedDoc.is_favorite && "text-accent")}
                                    onClick={() => updateDocumentImmediately(selectedDoc.id, { is_favorite: !selectedDoc.is_favorite })}
                                >
                                    {selectedDoc.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="rounded-xl h-9 gap-2 border-accent/10">
                                            {selectedDoc.is_public ? <Globe className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5" />}
                                            {selectedDoc.is_public ? "Público" : "Privado"}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl w-56">
                                            <DropdownMenuItem onClick={() => updateDocumentImmediately(selectedDoc.id, { is_public: !selectedDoc.is_public })}>
                                            {selectedDoc.is_public ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                                            Tornar {selectedDoc.is_public ? "Privado" : "Público"}
                                        </DropdownMenuItem>
                                        {selectedDoc.is_public && (
                                            <DropdownMenuItem onClick={() => copyPublicLink(selectedDoc.slug)}>
                                                <Share2 className="h-4 w-4 mr-2" />
                                                Copiar Link Público
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => deleteDocument(selectedDoc.id)}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir Documento
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {saving && <span className="text-[10px] text-muted-foreground animate-pulse flex items-center gap-1">
                                    <Save className="h-3 w-3" />
                                    Salvando...
                                </span>}
                                {!saving && <span className="text-[10px] text-muted-foreground opacity-30">Salvo</span>}
                            </div>
                        </div>

                        {/* Editor */}
                        <ScrollArea className="flex-1">
                            <div className="max-w-4xl mx-auto p-12">
                                <div className="mb-8 flex items-center gap-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="text-4xl p-0 h-14 w-14 hover:bg-accent/5 rounded-2xl">
                                                {selectedDoc.icon}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="grid grid-cols-4 p-2">
                                            {['📄', '🎯', '🏢', '📜', '💡', '🚀', '🛠️', '⚙️'].map(emoji => (
                                                <DropdownMenuItem key={emoji} onClick={() => updateDocumentImmediately(selectedDoc.id, { icon: emoji })} className="text-2xl justify-center cursor-pointer">
                                                    {emoji}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <h1 className="text-4xl font-black tracking-tight flex-1">{localTitle}</h1>
                                </div>

                                <ReactQuill
                                    theme="snow"
                                    value={localContent}
                                    onChange={(content) => {
                                        setLocalContent(content);
                                        debouncedSave(selectedDoc.id, { content });
                                    }}
                                    className="guia-editor"
                                    placeholder="Comece a escrever aqui..."
                                />
                            </div>
                        </ScrollArea>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                        <div className="h-16 w-16 bg-accent/5 rounded-3xl flex items-center justify-center text-accent/20">
                            <Plus className="h-8 w-8" />
                        </div>
                        <p>Selecione ou crie um documento para começar</p>
                        {isAdmin && (
                            <Button onClick={createDocument} variant="outline" className="rounded-xl border-accent/20">
                                Criar Primeiro Documento
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                .guia-editor .ql-container {
                    border: none !important;
                    font-size: 1.1rem;
                    font-family: inherit;
                    color: inherit;
                }
                .guia-editor .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid hsl(var(--border)) !important;
                    background: transparent;
                    padding: 8px 0;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    margin-bottom: 2rem;
                }
                .guia-editor .ql-editor {
                    padding: 0;
                    min-height: 500px;
                }
                .guia-editor .ql-editor p {
                    margin-bottom: 1rem;
                    line-height: 1.6;
                }
                .ql-snow .ql-stroke {
                    stroke: currentColor;
                }
                .ql-snow .ql-fill {
                    fill: currentColor;
                }
                .ql-picker {
                    color: currentColor !important;
                }
            `}</style>
        </div>
    );
}

function DocListItem({ doc, active, onClick }: { doc: Document, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group relative",
                active
                    ? "bg-accent/10 text-accent font-bold shadow-sm"
                    : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
            )}
        >
            <span className="text-base">{doc.icon}</span>
            <span className="truncate flex-1 text-left">{doc.title}</span>
            {doc.is_public && <Globe className="h-3 w-3 text-emerald-500 opacity-60" />}
        </button>
    );
}
