import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    UserPlus,
    Search,
    MoreVertical,
    Shield,
    UserX,
    UserCheck,
    KeyRound,
    Edit,
    Users,
    Building2,
    ListTodo
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { NovoUsuarioModal } from '@/components/admin/NovoUsuarioModal';
import { EditarUsuarioModal } from '@/components/admin/EditarUsuarioModal';
import { ResetSenhaDialog } from '@/components/admin/ResetSenhaDialog';
import { UserTasksModal } from '@/components/admin/UserTasksModal';
import { DepartamentosTab } from '@/components/admin/DepartamentosTab';
import { Profile } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';

export default function GestaoUsuarios() {
    const { profile: currentUser } = useAuth();
    const { toast } = useToast();
    const { departments } = useDepartments();

    const [usuarios, setUsuarios] = useState<Profile[]>([]);
    const [filteredUsuarios, setFilteredUsuarios] = useState<Profile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('usuarios');

    const [showNovoUsuarioModal, setShowNovoUsuarioModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [showEditarModal, setShowEditarModal] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showTasksModal, setShowTasksModal] = useState(false);

    // Carregar usuários
    const loadUsuarios = async () => {
        setIsLoading(true);
        try {
            // Fetch profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            // Fetch user roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) console.warn('Error fetching roles:', rolesError);

            // Map roles to profiles
            const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
            
            const profilesWithRoles = (profiles || []).map((profile: any) => ({
                ...profile,
                role: rolesMap.get(profile.id) || 'collaborator',
            }));
            
            setUsuarios(profilesWithRoles as Profile[]);
            setFilteredUsuarios(profilesWithRoles as Profile[]);
        } catch (error) {
            console.error('Error loading users:', error);
            toast({
                title: 'Erro ao carregar usuários',
                description: 'Não foi possível carregar a lista de usuários.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsuarios();
    }, []);

    // Filtro de busca
    useEffect(() => {
        const filtered = usuarios.filter(user => {
            const searchLower = searchTerm.toLowerCase();
            const dept = departments.find(d => d.id === user.department_id);
            return (
                user.full_name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                dept?.name.toLowerCase().includes(searchLower) ||
                user.job_title?.toLowerCase().includes(searchLower)
            );
        });
        setFilteredUsuarios(filtered);
    }, [searchTerm, usuarios, departments]);

    // Alterar permissão do usuário
    const handleChangeRole = async (user: Profile, newRole: 'admin' | 'collaborator' | 'guest') => {
        if (user.id === currentUser?.id) {
            toast({
                title: 'Ação não permitida',
                description: 'Você não pode alterar sua própria permissão.',
                variant: 'destructive',
            });
            return;
        }

        try {
            // Update role in user_roles table
            const { error: deleteError } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) console.warn('Error deleting old role:', deleteError);

            const { error: insertError } = await supabase
                .from('user_roles')
                .insert({ user_id: user.id, role: newRole });

            if (insertError) throw insertError;

            // Log activity
            await supabase
                .from('activity_logs')
                .insert({
                    user_id: currentUser?.id,
                    action: 'role_changed',
                    entity_type: 'user',
                    entity_id: user.id,
                    details: { new_role: newRole }
                });

            const roleLabel = newRole === 'admin' ? 'administrador' : newRole === 'guest' ? 'convidado' : 'colaborador';
            toast({
                title: 'Permissão atualizada',
                description: `${user.full_name} agora é ${roleLabel}.`,
            });

            loadUsuarios();
        } catch (error) {
            console.error('Error changing role:', error);
            toast({
                title: 'Erro ao atualizar permissão',
                description: 'Não foi possível atualizar a permissão do usuário.',
                variant: 'destructive',
            });
        }
    };

    // Alternar status ativo/inativo
    const handleToggleActive = async (user: Profile) => {
        if (user.id === currentUser?.id) {
            toast({
                title: 'Ação não permitida',
                description: 'Você não pode desativar sua própria conta.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const newStatus = !user.is_active;

            const { error } = await supabase
                .from('profiles')
                .update({ is_active: newStatus })
                .eq('id', user.id);

            if (error) throw error;

            // Log activity
            await supabase
                .from('activity_logs')
                .insert({
                    user_id: currentUser?.id,
                    action: newStatus ? 'user_activated' : 'user_deactivated',
                    entity_type: 'user',
                    entity_id: user.id,
                });

            toast({
                title: 'Status atualizado',
                description: `Conta ${newStatus ? 'ativada' : 'desativada'} com sucesso.`,
            });

            loadUsuarios();
        } catch (error) {
            console.error('Error toggling active status:', error);
            toast({
                title: 'Erro ao atualizar status',
                description: 'Não foi possível atualizar o status da conta.',
                variant: 'destructive',
            });
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const formatDate = (date?: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getDepartmentName = (departmentId?: string) => {
        if (!departmentId) return '-';
        const dept = departments.find(d => d.id === departmentId);
        return dept?.name || '-';
    };

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
                    <p className="text-muted-foreground mt-1">
                        {usuarios.length} usuários cadastrados
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="usuarios" className="gap-2">
                        <Users className="w-4 h-4" />
                        Usuários
                    </TabsTrigger>
                    <TabsTrigger value="departamentos" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Departamentos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="usuarios" className="space-y-6">
                    {/* Search and Add */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative max-w-md flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, email, departamento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={() => setShowNovoUsuarioModal(true)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Adicionar Usuário
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Departamento</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Permissão</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Último acesso</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsuarios.map((user) => (
                                    <TableRow
                                        key={user.id}
                                        className="cursor-pointer hover:bg-accent/5"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setShowTasksModal(true);
                                        }}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.avatar_url} />
                                                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{user.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getDepartmentName(user.department_id)}</TableCell>
                                        <TableCell>{user.job_title || '-'}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={user.role === 'admin' ? 'default' : user.role === 'guest' ? 'outline' : 'secondary'}
                                                className={user.role === 'admin' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                                            >
                                                {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                                {user.role === 'admin' ? 'Admin' : user.role === 'guest' ? 'Convidado' : 'Colaborador'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                                                {user.is_active ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(user.last_login_at)}</TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowTasksModal(true);
                                                    }}>
                                                        <ListTodo className="w-4 h-4 mr-2" />
                                                        Ver Tarefas
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowEditarModal(true);
                                                    }}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Editar perfil
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowResetDialog(true);
                                                    }}>
                                                        <KeyRound className="w-4 h-4 mr-2" />
                                                        Resetar senha
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={() => handleChangeRole(user, 'collaborator')}
                                                        disabled={user.id === currentUser?.id || user.role === 'collaborator'}
                                                    >
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        Colaborador
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={() => handleChangeRole(user, 'admin')}
                                                        disabled={user.id === currentUser?.id || user.role === 'admin'}
                                                    >
                                                        <Shield className="w-4 h-4 mr-2" />
                                                        Administrador
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={() => handleChangeRole(user, 'guest')}
                                                        disabled={user.id === currentUser?.id || user.role === 'guest'}
                                                    >
                                                        <Users className="w-4 h-4 mr-2" />
                                                        Convidado
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleActive(user)}
                                                        disabled={user.id === currentUser?.id}
                                                    >
                                                        {user.is_active ? (
                                                            <>
                                                                <UserX className="w-4 h-4 mr-2" />
                                                                Desativar
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck className="w-4 h-4 mr-2" />
                                                                Reativar
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {filteredUsuarios.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">
                                    {searchTerm ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
                                </p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="departamentos">
                    <DepartamentosTab />
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <NovoUsuarioModal
                open={showNovoUsuarioModal}
                onOpenChange={setShowNovoUsuarioModal}
                onSuccess={loadUsuarios}
            />

            {selectedUser && (
                <>
                    <EditarUsuarioModal
                        open={showEditarModal}
                        onOpenChange={setShowEditarModal}
                        user={selectedUser}
                        onSuccess={loadUsuarios}
                    />

                    <ResetSenhaDialog
                        open={showResetDialog}
                        onOpenChange={setShowResetDialog}
                        user={selectedUser}
                        onSuccess={loadUsuarios}
                    />

                    <UserTasksModal
                        open={showTasksModal}
                        onOpenChange={setShowTasksModal}
                        user={selectedUser}
                    />
                </>
            )}
        </div>
    );
}
