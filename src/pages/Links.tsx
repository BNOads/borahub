
import { useState, useEffect } from "react";
import { Search, Plus, ExternalLink, Star, StarOff, MoreVertical, LayoutGrid, List, Trash2, Edit, GripVertical, Copy, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LinkModal } from "@/components/links/LinkModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LinkItem {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  favicon: string;
  is_favorite?: boolean;
  order_index?: number;
}

const categoryColors: Record<string, string> = {
  Geral: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  Produtividade: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Armazenamento: "bg-green-500/10 text-green-500 border-green-500/20",
  Design: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Marketing: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Análise: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  Vendas: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

const categoriesList = ["Todas", "Geral", "Produtividade", "Armazenamento", "Design", "Marketing", "Análise", "Vendas"];

export default function Links() {
  const { isAdmin } = useAuth();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isIdOpen, setIsIdOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkItem | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  }

  const toggleFavorite = async (link: LinkItem) => {
    try {
      const { error } = await supabase
        .from("links")
        .update({ is_favorite: !(link.is_favorite ?? false) })
        .eq("id", link.id);
      if (error) throw error;
      fetchLinks();
    } catch (error: any) {
      toast.error("Erro ao favoritar link: " + error.message);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este link?")) return;
    try {
      const { error } = await supabase
        .from("links")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Link excluído!");
      fetchLinks();
    } catch (error: any) {
      toast.error("Erro ao excluir link: " + error.message);
    }
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch = link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || link.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteLinks = links.filter(link => link.is_favorite === true);
  const nonFavoriteLinks = links.filter(link => !link.is_favorite);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeLink = links.find(l => l.id === active.id);
      const overLink = links.find(l => l.id === over.id);

      // Only allow reordering if both are favorites or both are non-favorites
      // For simplicity, let's allow reordering within the same group if we want
      // but for now let's just do a global reorder.

      const oldIndex = links.findIndex((l) => l.id === active.id);
      const newIndex = links.findIndex((l) => l.id === over.id);

      const newLinks = arrayMove(links, oldIndex, newIndex);
      setLinks(newLinks);

      // Update order_index in DB
      // Update order in DB - use position for ordering
      for (let i = 0; i < newLinks.length; i++) {
        await supabase.from("links").update({ order_index: i }).eq("id", newLinks[i].id);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Links Úteis</h1>
          <p className="text-muted-foreground mt-1">
            Acesse rapidamente todas as ferramentas da equipe
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted p-1 rounded-xl flex">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg h-9"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg h-9"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
          </div>
          {isAdmin && (
            <Button onClick={() => { setSelectedLink(null); setIsIdOpen(true); }} className="rounded-xl bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Link
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar links..."
            className="pl-10 h-11 rounded-xl border-accent/20 focus-visible:ring-accent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px] h-11 rounded-xl">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categoriesList.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-accent/5 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {/* Favorites Section */}
            {favoriteLinks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-accent fill-accent" />
                  <h2 className="text-lg font-semibold">Favoritos</h2>
                </div>
                <SortableContext
                  items={favoriteLinks.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={cn(
                    viewMode === "kanban"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "flex flex-col gap-2"
                  )}>
                    {favoriteLinks.map((link) => (
                      <SortableLinkCard
                        key={link.id}
                        link={link}
                        viewMode={viewMode}
                        onToggleFavorite={() => toggleFavorite(link)}
                        onEdit={() => { setSelectedLink(link); setIsIdOpen(true); }}
                        onDelete={() => deleteLink(link.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}

            {/* All Links Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Outros Links</h2>
              <SortableContext
                items={nonFavoriteLinks.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={cn(
                  viewMode === "kanban"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-2"
                )}>
                  {nonFavoriteLinks.filter(l => selectedCategory === "Todas" || l.category === selectedCategory).map((link) => (
                    <SortableLinkCard
                      key={link.id}
                      link={link}
                      viewMode={viewMode}
                      onToggleFavorite={() => toggleFavorite(link)}
                      onEdit={() => { setSelectedLink(link); setIsIdOpen(true); }}
                      onDelete={() => deleteLink(link.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>

          {filteredLinks.length === 0 && (
            <div className="text-center py-12 bg-accent/5 rounded-3xl border border-dashed border-accent/20">
              <p className="text-muted-foreground">Nenhum link encontrado.</p>
            </div>
          )}
        </>
      )}

      <LinkModal
        isOpen={isIdOpen}
        onClose={() => setIsIdOpen(false)}
        link={selectedLink}
        onSuccess={fetchLinks}
      />
    </div>
  );
}

function SortableLinkCard({ link, viewMode, onToggleFavorite, onEdit, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0
  };

  if (viewMode === "list") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center justify-between p-3 rounded-xl border border-border bg-card/50 hover:border-accent/30 transition-all",
          isDragging && "opacity-50 shadow-2xl"
        )}
      >
        <div className="flex items-center gap-4">
          <button {...attributes} {...listeners} className="cursor-grab hover:text-accent">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {link.favicon && link.favicon.startsWith('http') ? (
            <img src={link.favicon} alt={link.name} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
              {link.name[0]}
            </div>
          )}
          <div>
            <h3 className="font-medium text-sm">{link.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[400px]">{link.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn("hidden md:block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border", categoryColors[link.category])}>
            {link.category}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFavorite}>
              {link.is_favorite ? <Star className="h-4 w-4 text-accent fill-accent" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                navigator.clipboard.writeText(link.url);
                toast.success("Link copiado!");
              }}
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: link.name, url: link.url });
                  } catch (err) {
                    // User cancelled or error
                  }
                } else {
                  navigator.clipboard.writeText(link.url);
                  toast.success("Link copiado!");
                }
              }}
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </Button>
            <a href={link.url} target="_blank" rel="noopener" className="p-2 hover:bg-accent/10 rounded-lg text-accent">
              <ExternalLink className="h-4 w-4" />
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-2xl border border-border bg-card/50 p-5 hover:border-accent/40 hover:shadow-xl transition-all duration-300 backdrop-blur-sm",
        isDragging && "opacity-50 shadow-2xl"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {link.favicon && link.favicon.startsWith('http') ? (
            <img src={link.favicon} alt={link.name} className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold">
              {link.name[0]}
            </div>
          )}
          <div>
            <h3 className="font-semibold group-hover:text-accent transition-colors leading-tight">
              {link.name}
            </h3>
            <Badge
              variant="outline"
              className={cn("text-[10px] mt-1 h-5 rounded-full border-none", categoryColors[link.category])}
            >
              {link.category}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button {...attributes} {...listeners} className="p-2 cursor-grab hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10 leading-relaxed">
        {link.description || "Nenhuma descrição fornecida."}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-accent/5 hover:bg-accent/20" onClick={onToggleFavorite}>
            {link.is_favorite ? (
              <Star className="h-4 w-4 text-accent fill-accent" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-accent/5 hover:bg-accent/20"
            onClick={() => {
              navigator.clipboard.writeText(link.url);
              toast.success("Link copiado!");
            }}
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-accent/5 hover:bg-accent/20"
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title: link.name, url: link.url });
                } catch (err) {
                  // User cancelled or error
                }
              } else {
                navigator.clipboard.writeText(link.url);
                toast.success("Link copiado!");
              }
            }}
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <Button asChild variant="outline" className="rounded-xl h-9 px-4 gap-2 hover:bg-accent hover:text-accent-foreground border-accent/20">
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            Acessar
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}
