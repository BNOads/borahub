import { useState } from "react";
import { Search, Grid3X3, List, Mail, Phone, MapPin } from "lucide-react";
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
import { cn } from "@/lib/utils";

const teamMembers = [
  {
    id: 1,
    name: "João Silva",
    role: "CEO & Fundador",
    department: "Diretoria",
    email: "joao@boranaobra.com",
    phone: "(11) 99999-1234",
    location: "São Paulo, SP",
    avatar: "JS",
    status: "active",
    isAdmin: true,
  },
  {
    id: 2,
    name: "Maria Santos",
    role: "Head de Marketing",
    department: "Marketing",
    email: "maria@boranaobra.com",
    phone: "(11) 99999-2345",
    location: "São Paulo, SP",
    avatar: "MS",
    status: "active",
    isAdmin: true,
  },
  {
    id: 3,
    name: "Pedro Lima",
    role: "Gestor de Tráfego",
    department: "Marketing",
    email: "pedro@boranaobra.com",
    phone: "(11) 99999-3456",
    location: "Rio de Janeiro, RJ",
    avatar: "PL",
    status: "active",
    isAdmin: false,
  },
  {
    id: 4,
    name: "Ana Oliveira",
    role: "Designer Gráfico",
    department: "Criação",
    email: "ana@boranaobra.com",
    phone: "(11) 99999-4567",
    location: "São Paulo, SP",
    avatar: "AO",
    status: "vacation",
    isAdmin: false,
  },
  {
    id: 5,
    name: "Carlos Mendes",
    role: "Copywriter",
    department: "Conteúdo",
    email: "carlos@boranaobra.com",
    phone: "(11) 99999-5678",
    location: "Belo Horizonte, MG",
    avatar: "CM",
    status: "active",
    isAdmin: false,
  },
  {
    id: 6,
    name: "Fernanda Costa",
    role: "Social Media",
    department: "Conteúdo",
    email: "fernanda@boranaobra.com",
    phone: "(11) 99999-6789",
    location: "São Paulo, SP",
    avatar: "FC",
    status: "active",
    isAdmin: false,
  },
  {
    id: 7,
    name: "Lucas Almeida",
    role: "Desenvolvedor",
    department: "Tecnologia",
    email: "lucas@boranaobra.com",
    phone: "(11) 99999-7890",
    location: "Curitiba, PR",
    avatar: "LA",
    status: "active",
    isAdmin: false,
  },
  {
    id: 8,
    name: "Juliana Rocha",
    role: "Atendimento ao Cliente",
    department: "Suporte",
    email: "juliana@boranaobra.com",
    phone: "(11) 99999-8901",
    location: "São Paulo, SP",
    avatar: "JR",
    status: "away",
    isAdmin: false,
  },
];

const departments = ["Todos", "Diretoria", "Marketing", "Criação", "Conteúdo", "Tecnologia", "Suporte"];

const statusConfig = {
  active: { label: "Ativo", class: "bg-success text-success-foreground" },
  vacation: { label: "Férias", class: "bg-warning text-warning-foreground" },
  away: { label: "Afastado", class: "bg-muted text-muted-foreground" },
};

export default function Equipe() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("Todos");

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === "Todos" || member.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Equipe</h1>
        <p className="text-muted-foreground mt-1">
          Conheça todos os membros da nossa equipe
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cargo..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Team Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map((member, index) => (
            <div
              key={member.id}
              className="group rounded-xl border border-border bg-card p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-accent-foreground group-hover:scale-105 transition-transform">
                    {member.avatar}
                  </div>
                  <div className={cn(
                    "absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-card",
                    member.status === "active" ? "bg-success" : member.status === "vacation" ? "bg-warning" : "bg-muted"
                  )} />
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{member.name}</h3>
                  {member.isAdmin && (
                    <Badge className="bg-foreground text-background text-xs">Admin</Badge>
                  )}
                </div>
                
                <p className="text-sm text-accent font-medium">{member.role}</p>
                <p className="text-sm text-muted-foreground mb-4">{member.department}</p>
                
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", statusConfig[member.status as keyof typeof statusConfig].class)}
                >
                  {statusConfig[member.status as keyof typeof statusConfig].label}
                </Badge>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border w-full justify-center">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold">Membro</th>
                <th className="text-left p-4 font-semibold hidden md:table-cell">Departamento</th>
                <th className="text-left p-4 font-semibold hidden lg:table-cell">Localização</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-right p-4 font-semibold">Contato</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, index) => (
                <tr 
                  key={member.id} 
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center font-semibold text-accent-foreground">
                        {member.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.isAdmin && (
                            <Badge className="bg-foreground text-background text-xs">Admin</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{member.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">
                    {member.department}
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {member.location}
                    </span>
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", statusConfig[member.status as keyof typeof statusConfig].class)}
                    >
                      {statusConfig[member.status as keyof typeof statusConfig].label}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum membro encontrado.</p>
        </div>
      )}
    </div>
  );
}
