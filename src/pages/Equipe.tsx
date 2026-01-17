import { useState, useEffect } from "react";
import { Search, Grid3X3, List, Mail, Phone, MapPin, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Department {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  display_name?: string;
  email: string;
  phone?: string;
  job_title?: string;
  avatar_url?: string;
  role?: "admin" | "collaborator";
  is_active: boolean;
  department?: {
    id: string;
    name: string;
  } | null;
  department_id?: string | null;
}

export default function Equipe() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("Todos");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch team members with department info
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          display_name,
          email,
          phone,
          job_title,
          avatar_url,
          is_active,
          department_id,
          department:departments(id, name)
        `)
        .eq("is_active", true)
        .order("full_name");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Em caso de erro, tenta buscar sem o join
        const { data: simpleProfiles } = await supabase
          .from("profiles")
          .select("*")
          .eq("is_active", true)
          .order("full_name");
        
        const membersWithDefaults = (simpleProfiles || []).map((p: any) => ({
          ...p,
          role: 'collaborator' as const,
        }));
        setTeamMembers(membersWithDefaults);
      } else if (profiles) {
        // Add default role to profiles
        const membersWithRoles = profiles.map((p: any) => ({
          ...p,
          role: 'collaborator' as const,
        }));
        setTeamMembers(membersWithRoles);
      } else {
        setTeamMembers([]);
      }

      // Fetch departments
      const { data: depts, error: deptsError } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (deptsError) {
        console.error("Error fetching departments:", deptsError);
      } else {
        setDepartments(depts || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (member.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesDepartment =
      selectedDepartment === "Todos" || member.department?.name === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

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
              <SelectItem value="Todos">Todos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
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
                  <Avatar className="h-20 w-20 group-hover:scale-105 transition-transform">
                    <AvatarImage src={member.avatar_url} alt={member.full_name} />
                    <AvatarFallback className="text-2xl font-bold bg-accent text-accent-foreground">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-card bg-success" />
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{member.display_name || member.full_name}</h3>
                  {member.role === "admin" && (
                    <Badge className="bg-foreground text-background text-xs">Admin</Badge>
                  )}
                </div>

                <p className="text-sm text-accent font-medium">{member.job_title || "Colaborador"}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {member.department?.name || "Sem departamento"}
                </p>

                <Badge variant="outline" className="text-xs bg-success text-success-foreground">
                  Ativo
                </Badge>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border w-full justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => window.open(`mailto:${member.email}`, "_blank")}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  {member.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => window.open(`tel:${member.phone}`, "_blank")}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
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
                <th className="text-left p-4 font-semibold hidden lg:table-cell">Cargo</th>
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
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url} alt={member.full_name} />
                        <AvatarFallback className="font-semibold bg-accent text-accent-foreground">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.display_name || member.full_name}
                          </span>
                          {member.role === "admin" && (
                            <Badge className="bg-foreground text-background text-xs">Admin</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">
                    {member.department?.name || "Sem departamento"}
                  </td>
                  <td className="p-4 hidden lg:table-cell text-muted-foreground">
                    {member.job_title || "Colaborador"}
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs bg-success text-success-foreground">
                      Ativo
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(`mailto:${member.email}`, "_blank")}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      {member.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(`tel:${member.phone}`, "_blank")}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
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
