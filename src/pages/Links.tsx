import { useState } from "react";
import { Search, Plus, ExternalLink, Star, StarOff, MoreVertical } from "lucide-react";
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

interface LinkItem {
  id: number;
  name: string;
  url: string;
  description: string;
  category: string;
  favicon: string;
  isFavorite: boolean;
}

const initialLinks: LinkItem[] = [
  {
    id: 1,
    name: "Trello",
    url: "https://trello.com/b/abc123",
    description: "Quadro de gestão de projetos",
    category: "Produtividade",
    favicon: "T",
    isFavorite: true,
  },
  {
    id: 2,
    name: "Google Drive",
    url: "https://drive.google.com/drive/folders/xyz",
    description: "Pasta principal da empresa",
    category: "Armazenamento",
    favicon: "G",
    isFavorite: true,
  },
  {
    id: 3,
    name: "Canva",
    url: "https://canva.com",
    description: "Criação de artes e designs",
    category: "Design",
    favicon: "C",
    isFavorite: false,
  },
  {
    id: 4,
    name: "Meta Business Suite",
    url: "https://business.facebook.com",
    description: "Gestão de redes sociais Meta",
    category: "Marketing",
    favicon: "M",
    isFavorite: true,
  },
  {
    id: 5,
    name: "Google Analytics",
    url: "https://analytics.google.com",
    description: "Métricas e análise de dados",
    category: "Análise",
    favicon: "A",
    isFavorite: false,
  },
  {
    id: 6,
    name: "Hotmart",
    url: "https://hotmart.com",
    description: "Plataforma de infoprodutos",
    category: "Vendas",
    favicon: "H",
    isFavorite: false,
  },
  {
    id: 7,
    name: "Notion",
    url: "https://notion.so/workspace",
    description: "Documentação interna",
    category: "Produtividade",
    favicon: "N",
    isFavorite: false,
  },
  {
    id: 8,
    name: "Figma",
    url: "https://figma.com/files",
    description: "Protótipos e designs UI/UX",
    category: "Design",
    favicon: "F",
    isFavorite: false,
  },
];

const categories = ["Todas", "Produtividade", "Armazenamento", "Design", "Marketing", "Análise", "Vendas"];

const categoryColors: Record<string, string> = {
  Produtividade: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Armazenamento: "bg-green-500/10 text-green-500 border-green-500/20",
  Design: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Marketing: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Análise: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  Vendas: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

export default function Links() {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  const toggleFavorite = (id: number) => {
    setLinks(links.map(link => 
      link.id === id ? { ...link, isFavorite: !link.isFavorite } : link
    ));
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch = link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || link.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteLinks = filteredLinks.filter(link => link.isFavorite);
  const otherLinks = filteredLinks.filter(link => !link.isFavorite);

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
        <Button variant="gold">
          <Plus className="h-4 w-4 mr-2" />
          Novo Link
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar links..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Favorites Section */}
      {favoriteLinks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent fill-accent" />
            <h2 className="text-lg font-semibold">Favoritos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favoriteLinks.map((link, index) => (
              <LinkCard 
                key={link.id} 
                link={link} 
                onToggleFavorite={toggleFavorite}
                delay={index * 0.05}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Links Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Todos os Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {otherLinks.map((link, index) => (
            <LinkCard 
              key={link.id} 
              link={link} 
              onToggleFavorite={toggleFavorite}
              delay={(favoriteLinks.length + index) * 0.05}
            />
          ))}
        </div>
      </div>

      {filteredLinks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum link encontrado.</p>
        </div>
      )}
    </div>
  );
}

function LinkCard({ 
  link, 
  onToggleFavorite,
  delay 
}: { 
  link: LinkItem; 
  onToggleFavorite: (id: number) => void;
  delay: number;
}) {
  return (
    <div 
      className="group relative rounded-xl border border-border bg-card p-5 hover:border-accent/50 hover:shadow-lg transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold">
            {link.favicon}
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-accent transition-colors">
              {link.name}
            </h3>
            <Badge 
              variant="outline" 
              className={cn("text-xs mt-1", categoryColors[link.category])}
            >
              {link.category}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggleFavorite(link.id)}
          >
            {link.isFavorite ? (
              <Star className="h-4 w-4 text-accent fill-accent" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {link.description}
      </p>

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
      >
        Acessar
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
