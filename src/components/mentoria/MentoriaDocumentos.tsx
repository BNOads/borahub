import { useState, useEffect, useRef } from "react";
import { Search, Plus, Star, Trash2, Save, FileText, Folder, FolderPlus, ChevronRight, ChevronDown, MoreHorizontal, Pencil, Globe, Lock, Link2, FolderOpen, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from "@/contexts/AuthContext";

interface MentoriaDocument {
  id: string;
  title: string;
  content: string;
  icon: string;
  is_favorite: boolean;
  is_public: boolean;
  slug: string;
  category: string | null;
  updated_at: string;
  google_docs_url: string | null;
  processo_id: string | null;
}

interface MentoriaFolder {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

function getGoogleDocsEmbedUrl(url: string): string | null {
  if (!url) return null;
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`;
  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) return `https://docs.google.com/presentation/d/${slideMatch[1]}/embed`;
  return null;
}

export function MentoriaDocumentos() {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState<MentoriaDocument[]>([]);
  const [folders, setFolders] = useState<MentoriaFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<MentoriaDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["__favorites__", "__root__"]));
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [googleDocsUrl, setGoogleDocsUrl] = useState("");
  const [contentType, setContentType] = useState<"editor" | "googledocs">("editor");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      setLocalTitle(selectedDoc.title);
      setLocalContent(selectedDoc.content || "");
      setGoogleDocsUrl(selectedDoc.google_docs_url || "");
      setContentType(selectedDoc.google_docs_url ? "googledocs" : "editor");
      setIsEditingTitle(false);
    }
  }, [selectedDoc?.id]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isCreatingFolder && folderInputRef.current) {
      folderInputRef.current.focus();
    }
  }, [isCreatingFolder]);

  async function fetchFolders() {
    try {
      const { data, error } = await supabase
        .from("mentoria_document_folders")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  }

  async function fetchDocuments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("mentoria_documentos")
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

  const createDocument = async (folder?: string) => {
    try {
      const { data, error } = await supabase
        .from("mentoria_documentos")
        .insert([{ title: "Novo Documento", content: "", icon: "📄", category: folder || null }])
        .select()
        .single();

      if (error) throw error;
      toast.success("Documento criado!");
      fetchDocuments();
      setSelectedDoc(data);
      setIsEditingTitle(true);
      if (folder) {
        setExpandedFolders(prev => new Set([...prev, folder]));
      }
    } catch (error: any) {
      toast.error("Erro ao criar documento: " + error.message);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      const { data, error } = await supabase
        .from("mentoria_document_folders")
        .insert({ name: newFolderName.trim(), created_by: userId })
        .select()
        .single();
      
      if (error) throw error;
      
      setFolders(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setExpandedFolders(prev => new Set([...prev, newFolderName.trim()]));
      toast.success(`Pasta "${newFolderName.trim()}" criada!`);
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("Já existe uma pasta com esse nome");
      } else {
        toast.error("Erro ao criar pasta: " + error.message);
      }
    }
  };

  const moveDocToFolder = async (docId: string, folder: string | null) => {
    try {
      const { error } = await supabase.from("mentoria_documentos").update({ category: folder }).eq("id", docId);
      if (error) throw error;
      toast.success(folder ? `Movido para "${folder}"` : "Movido para raiz");
      fetchDocuments();
    } catch (error: any) {
      toast.error("Erro ao mover: " + error.message);
    }
  };

  const performSave = async (id: string, updates: Partial<MentoriaDocument>) => {
    try {
      setSaving(true);
      const { error } = await supabase.from("mentoria_documentos").update(updates).eq("id", id);
      if (error) throw error;
      setDocuments(docs => docs.map(d => d.id === id ? { ...d, ...updates } : d));
      if (selectedDoc?.id === id) {
        setSelectedDoc(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const debouncedSave = (id: string, updates: Partial<MentoriaDocument>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => performSave(id, updates), 2000);
  };

  const saveTitle = () => {
    if (selectedDoc && localTitle.trim()) {
      performSave(selectedDoc.id, { title: localTitle.trim() });
      setIsEditingTitle(false);
    }
  };

  const cancelTitleEdit = () => {
    if (selectedDoc) setLocalTitle(selectedDoc.title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveTitle();
    else if (e.key === "Escape") cancelTitleEdit();
  };

  const saveGoogleDocsUrl = () => {
    if (selectedDoc) {
      const embedUrl = getGoogleDocsEmbedUrl(googleDocsUrl);
      if (googleDocsUrl && !embedUrl) {
        toast.error("URL inválida. Use um link do Google Docs, Sheets ou Slides.");
        return;
      }
      performSave(selectedDoc.id, { google_docs_url: googleDocsUrl || null });
      toast.success(googleDocsUrl ? "Google Docs vinculado!" : "Link removido!");
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm("Excluir este documento?")) return;
    try {
      const { error } = await supabase.from("mentoria_documentos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Documento excluído");
      if (selectedDoc?.id === id) setSelectedDoc(null);
      fetchDocuments();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteDocs = filteredDocs.filter(d => d.is_favorite);
  const folderNames = [...new Set([...folders.map(f => f.name), ...filteredDocs.filter(d => d.category).map(d => d.category!)])].sort();
  const rootDocs = filteredDocs.filter(d => !d.is_favorite && !d.category);
  const getDocsInFolder = (folder: string) => filteredDocs.filter(d => !d.is_favorite && d.category === folder);

  const embedUrl = selectedDoc?.google_docs_url ? getGoogleDocsEmbedUrl(selectedDoc.google_docs_url) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-card/30 rounded-xl border border-border overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col bg-card/50">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">Documentos</h2>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="rounded-lg h-7 w-7" onClick={() => setIsCreatingFolder(true)} title="Nova pasta">
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-lg h-7 w-7" onClick={() => createDocument()} title="Novo documento">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8 h-8 text-sm rounded-lg bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 p-2">
            {/* New Folder Input */}
            {isCreatingFolder && (
              <div className="flex items-center gap-2 px-2 py-1">
                <Folder className="h-4 w-4 text-amber-500" />
                <Input
                  ref={folderInputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createFolder();
                    if (e.key === "Escape") { setIsCreatingFolder(false); setNewFolderName(""); }
                  }}
                  onBlur={createFolder}
                  placeholder="Nome da pasta..."
                  className="h-6 text-xs rounded-md"
                />
              </div>
            )}

            {/* Favorites */}
            {favoriteDocs.length > 0 && (
              <Collapsible open={expandedFolders.has("__favorites__")} onOpenChange={() => toggleFolder("__favorites__")}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  {expandedFolders.has("__favorites__") ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Star className="h-3 w-3 fill-current text-amber-500" />
                  Favoritos
                  <span className="ml-auto text-[9px] opacity-50">{favoriteDocs.length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 ml-2">
                  {favoriteDocs.map(doc => (
                    <DocListItem
                      key={doc.id}
                      doc={doc}
                      active={selectedDoc?.id === doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      onDelete={() => deleteDocument(doc.id)}
                      onToggleFavorite={() => performSave(doc.id, { is_favorite: !doc.is_favorite })}
                      onChangeIcon={(icon) => performSave(doc.id, { icon })}
                      folders={folderNames}
                      onMoveToFolder={(folder) => moveDocToFolder(doc.id, folder)}
                      isAdmin={isAdmin}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Folders */}
            {folderNames.map(folder => (
              <Collapsible key={folder} open={expandedFolders.has(folder)} onOpenChange={() => toggleFolder(folder)}>
                <div className="flex items-center group">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    {expandedFolders.has(folder) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {expandedFolders.has(folder) ? <FolderOpen className="h-3 w-3 text-amber-500" /> : <Folder className="h-3 w-3 text-amber-500" />}
                    <span className="truncate">{folder}</span>
                    <span className="ml-auto text-[9px] opacity-50">{getDocsInFolder(folder).length}</span>
                  </CollapsibleTrigger>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); createDocument(folder); }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <CollapsibleContent className="space-y-0.5 ml-2">
                  {getDocsInFolder(folder).map(doc => (
                  <DocListItem
                      key={doc.id}
                      doc={doc}
                      active={selectedDoc?.id === doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      onDelete={() => deleteDocument(doc.id)}
                      onToggleFavorite={() => performSave(doc.id, { is_favorite: !doc.is_favorite })}
                      onChangeIcon={(icon) => performSave(doc.id, { icon })}
                      folders={folderNames}
                      onMoveToFolder={(f) => moveDocToFolder(doc.id, f)}
                      isAdmin={isAdmin}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Root Documents */}
            {rootDocs.length > 0 && (
              <Collapsible open={expandedFolders.has("__root__")} onOpenChange={() => toggleFolder("__root__")}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  {expandedFolders.has("__root__") ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <FileText className="h-3 w-3" />
                  Documentos
                  <span className="ml-auto text-[9px] opacity-50">{rootDocs.length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 ml-2">
                  {rootDocs.map(doc => (
                  <DocListItem
                      key={doc.id}
                      doc={doc}
                      active={selectedDoc?.id === doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      onDelete={() => deleteDocument(doc.id)}
                      onToggleFavorite={() => performSave(doc.id, { is_favorite: !doc.is_favorite })}
                      onChangeIcon={(icon) => performSave(doc.id, { icon })}
                      folders={folderNames}
                      onMoveToFolder={(f) => moveDocToFolder(doc.id, f)}
                      isAdmin={isAdmin}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {filteredDocs.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum documento</p>
                <Button variant="link" size="sm" onClick={() => createDocument()}>
                  Criar primeiro documento
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedDoc ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-3 flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-xl hover:bg-muted rounded-md p-1 transition-colors" title="Alterar ícone">
                      {selectedDoc.icon}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <p className="text-xs text-muted-foreground mb-2 px-1">Escolha um ícone:</p>
                    <div className="grid grid-cols-8 gap-1">
                      {["📄", "📝", "📋", "📁", "📂", "📑", "📃", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "🗂️", "🗃️", "🗄️", "📊", "📈", "📉", "🎯", "💡", "⚡", "🔥", "✨", "🚀", "💎", "🎨", "🎭", "🎬", "🎤", "🎧", "📷", "📹", "💻", "🖥️", "📱", "⌨️", "🔧", "⚙️", "🛠️", "🔨", "📌", "📍", "🏷️", "🔖"].map((emoji) => (
                        <button
                          key={emoji}
                          className="p-1.5 text-lg hover:bg-muted rounded-md transition-colors"
                          onClick={() => performSave(selectedDoc.id, { icon: emoji })}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Input
                      ref={titleInputRef}
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      className="h-8 text-lg font-bold"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveTitle}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h1
                    className="text-lg font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {selectedDoc.title}
                  </h1>
                )}
              </div>
              <div className="flex items-center gap-2">
                {saving && <span className="text-xs text-muted-foreground">Salvando...</span>}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => performSave(selectedDoc.id, { is_favorite: !selectedDoc.is_favorite })}
                >
                  <Star className={cn("h-4 w-4", selectedDoc.is_favorite && "fill-amber-500 text-amber-500")} />
                </Button>
              </div>
            </div>

            {/* Content Type Selector */}
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <Tabs value={contentType} onValueChange={(v) => setContentType(v as "editor" | "googledocs")}>
                <TabsList className="h-8">
                  <TabsTrigger value="editor" className="text-xs px-3 h-6">
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Editor
                  </TabsTrigger>
                  <TabsTrigger value="googledocs" className="text-xs px-3 h-6">
                    <Link2 className="h-3 w-3 mr-1.5" />
                    Google Docs
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Editor or Google Docs */}
            <div className="flex-1 overflow-hidden">
              {contentType === "editor" ? (
                <div className="h-full p-4">
                  <ReactQuill
                    theme="snow"
                    value={localContent}
                    onChange={(value) => {
                      setLocalContent(value);
                      if (selectedDoc) debouncedSave(selectedDoc.id, { content: value });
                    }}
                    className="h-[calc(100%-60px)]"
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link", "image"],
                        ["clean"],
                      ],
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Input
                      placeholder="Cole o link do Google Docs, Sheets ou Slides..."
                      value={googleDocsUrl}
                      onChange={(e) => setGoogleDocsUrl(e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button size="sm" onClick={saveGoogleDocsUrl}>
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="flex-1 w-full border-0"
                      title="Google Docs"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <p>Cole um link do Google Docs para visualizar</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Selecione um documento ou crie um novo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Document List Item Component
interface DocListItemProps {
  doc: MentoriaDocument;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onChangeIcon: (icon: string) => void;
  folders: string[];
  onMoveToFolder: (folder: string | null) => void;
  isAdmin: boolean;
}

function DocListItem({ doc, active, onClick, onDelete, onToggleFavorite, onChangeIcon, folders, onMoveToFolder, isAdmin }: DocListItemProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <span className="text-sm">{doc.icon}</span>
      <span className="flex-1 text-sm truncate">{doc.title}</span>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
            <Star className={cn("h-4 w-4 mr-2", doc.is_favorite && "fill-amber-500 text-amber-500")} />
            {doc.is_favorite ? "Remover dos favoritos" : "Favoritar"}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Smile className="h-4 w-4 mr-2" />
              Alterar ícone
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-2 bg-popover">
              <div className="grid grid-cols-6 gap-1 max-w-[180px]">
                {["📄", "📝", "📋", "📁", "📂", "📑", "📃", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "🗂️", "🗃️", "📊", "📈", "📉", "🎯", "💡", "⚡"].map((emoji) => (
                  <button
                    key={emoji}
                    className="p-1 text-base hover:bg-muted rounded transition-colors"
                    onClick={(e) => { e.stopPropagation(); onChangeIcon(emoji); }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Folder className="h-4 w-4 mr-2" />
              Mover para
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveToFolder(null); }}>
                <FileText className="h-4 w-4 mr-2" />
                Raiz
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {folders.map(folder => (
                <DropdownMenuItem key={folder} onClick={(e) => { e.stopPropagation(); onMoveToFolder(folder); }}>
                  <Folder className="h-4 w-4 mr-2" />
                  {folder}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
