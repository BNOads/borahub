import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, X, Sun, Moon, User, Settings, LogOut, ChevronDown, Shield } from "lucide-react";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Início", href: "/" },
  { name: "Acesso Rápido", href: "/acesso-rapido" },
  { name: "Treinamentos", href: "/treinamentos" },
];

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export function Header({ isDark, toggleTheme }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin, signOut } = useAuth();
  const notificationCount = 3;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleProfile = () => {
    navigate("/perfil");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={isDark ? logoDark : logo} alt="BORAnaOBRA" className="h-10 w-10 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight hidden sm:block">
              BORA<span className="text-accent">na</span>OBRA
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold">Notificações</span>
                <Button variant="ghost" size="sm" className="text-xs text-accent">
                  Marcar todas como lidas
                </Button>
              </div>
              <div className="py-2">
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                  <span className="font-medium">Nova tarefa atribuída</span>
                  <span className="text-sm text-muted-foreground">Revisar copy do lançamento</span>
                  <span className="text-xs text-muted-foreground">2 min atrás</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                  <span className="font-medium">Reunião em 30 minutos</span>
                  <span className="text-sm text-muted-foreground">Daily da equipe</span>
                  <span className="text-xs text-muted-foreground">10 min atrás</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                  <span className="font-medium">OKR atualizado</span>
                  <span className="text-sm text-muted-foreground">Meta Q1 atingiu 75%</span>
                  <span className="text-xs text-muted-foreground">1 hora atrás</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-accent font-medium">
                Ver todas as notificações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {getInitials(profile?.display_name || profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">
                  {profile?.display_name || profile?.full_name || 'Usuário'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                {isAdmin && (
                  <Badge className="mt-2 text-xs bg-amber-500 hover:bg-amber-600">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              <DropdownMenuItem onClick={handleProfile}>
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin/usuarios")}>
                    <Shield className="mr-2 h-4 w-4" />
                    Gestão de Usuários
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}
