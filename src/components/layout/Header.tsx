import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Sun, Moon, User, LogOut, ChevronDown, Shield, Info, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Send } from "lucide-react";
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
import {
  useUnreadNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  Notification,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EnviarNotificacaoModal } from "@/components/admin/EnviarNotificacaoModal";

const fullNavigation = [
  { name: "Inicio", href: "/" },
  { name: "Acesso Rapido", href: "/acesso-rapido" },
  { name: "Treinamentos", href: "/treinamentos" },
];

const guestNavigation = [
  { name: "Inicio", href: "/" },
];

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const notificationTypeIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  alert: AlertCircle,
};

const notificationTypeColors = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-yellow-500",
  alert: "text-red-500",
};

export function Header({ isDark, toggleTheme }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin, isGuest, signOut } = useAuth();
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const { data: notifications = [], isLoading: loadingNotifications } = useUnreadNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

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

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  const formatNotificationTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "";
    }
  };

  return (
    <>
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
            {(isGuest ? guestNavigation : fullNavigation).map((item) => (
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
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold">Notificacoes</span>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-accent h-auto p-1"
                      onClick={handleMarkAllAsRead}
                      disabled={markAllAsRead.isPending}
                    >
                      {markAllAsRead.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Marcar todas como lidas"
                      )}
                    </Button>
                  )}
                </div>
                <div className="py-2 max-h-80 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhuma notificacao</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => {
                      const Icon = notificationTypeIcons[notification.type] || Info;
                      const iconColor = notificationTypeColors[notification.type] || "text-blue-500";

                      return (
                        <DropdownMenuItem
                          key={notification.id}
                          className={cn(
                            "flex items-start gap-3 p-4 cursor-pointer",
                            !notification.read && "bg-accent/5"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconColor)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatNotificationTime(notification.created_at)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="justify-center text-accent font-medium"
                      onClick={() => navigate("/notificacoes")}
                    >
                      Ver todas as notificacoes
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3 h-auto py-1.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {getInitials(profile?.display_name || profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {profile?.display_name || profile?.full_name || 'Usuario'}
                    </span>
                    {isAdmin && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500 hover:bg-amber-600">
                        <Shield className="w-2.5 h-2.5 mr-0.5" />
                        Admin
                      </Badge>
                    )}
                    {isGuest && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground">
                        Convidado
                      </Badge>
                    )}
                  </div>
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
                  {isGuest && (
                    <Badge className="mt-2 text-xs bg-muted text-muted-foreground">
                      Convidado
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
                    <DropdownMenuItem onClick={() => navigate("/admin/diretoria")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Diretoria
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowNotificationModal(true)}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Notificacao
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

      {/* Modal de Notificacao */}
      <EnviarNotificacaoModal
        open={showNotificationModal}
        onOpenChange={setShowNotificationModal}
      />
    </>
  );
}
