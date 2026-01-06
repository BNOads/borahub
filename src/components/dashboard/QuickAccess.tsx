import { 
  BookOpen, 
  Users, 
  Link as LinkIcon, 
  Key, 
  FileText, 
  Calendar, 
  Target, 
  TrendingUp,
  Plus,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const quickLinks = [
  { name: "Treinamentos", href: "/treinamentos", icon: BookOpen, color: "bg-blue-500/10 text-blue-500" },
  { name: "Equipe", href: "/equipe", icon: Users, color: "bg-green-500/10 text-green-500" },
  { name: "Links Úteis", href: "/links", icon: LinkIcon, color: "bg-purple-500/10 text-purple-500" },
  { name: "Senhas", href: "/senhas", icon: Key, color: "bg-orange-500/10 text-orange-500" },
  { name: "Conteúdo", href: "/conteudo", icon: FileText, color: "bg-pink-500/10 text-pink-500" },
  { name: "Reuniões", href: "/reunioes", icon: Calendar, color: "bg-cyan-500/10 text-cyan-500" },
  { name: "Funis", href: "/funis", icon: TrendingUp, color: "bg-yellow-500/10 text-yellow-500" },
  { name: "Metas", href: "/metas", icon: Target, color: "bg-red-500/10 text-red-500" },
];

export function QuickAccess() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Acesso Rápido</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {quickLinks.map((link) => (
          <Link
            key={link.name}
            to={link.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
          >
            <div className={cn("p-2 rounded-lg", link.color)}>
              <link.icon className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm group-hover:text-accent transition-colors">
              {link.name}
            </span>
          </Link>
        ))}
        
        <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full text-muted-foreground hover:text-foreground">
          <div className="p-2 rounded-lg bg-muted">
            <Plus className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm">Adicionar atalho</span>
        </button>
      </div>
    </div>
  );
}
