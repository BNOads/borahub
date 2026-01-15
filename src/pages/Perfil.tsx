import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Mail, User, Phone, Calendar, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Perfil() {
  const navigate = useNavigate();
  const { profile, updateProfile, refreshProfile, updatePassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    phone: '',
    birth_date: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (profile?.id) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        display_name: profile.display_name || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        bio: profile.bio || '',
      }));
    }
  }, [profile?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    if (!passwordData.currentPassword) {
      toast.error('Digite sua senha atual');
      return;
    }
    
    if (!passwordData.newPassword) {
      toast.error('Digite a nova senha');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não correspondem');
      return;
    }

    setIsChangingPassword(true);
    try {
      await updatePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Senha alterada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile(formData);
      await refreshProfile();
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Atualize seus dados pessoais</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    name="full_name"
                    placeholder="Seu nome completo"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="pl-9"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Nome de Exibição</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  placeholder="Como deseja ser chamado"
                  value={formData.display_name}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@boranaobra.com"
                    value={profile?.email || ''}
                    className="pl-9"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-9"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="birth_date"
                    name="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="pl-9"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                placeholder="Fale um pouco sobre você..."
                value={formData.bio}
                onChange={handleChange}
                disabled={isSaving}
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Segurança
          </CardTitle>
          <CardDescription>Altere sua senha</CardDescription>
        </CardHeader>

        <CardContent>
          {!showPasswordForm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordForm(true)}
              className="w-full"
            >
              Alterar Senha
            </Button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  disabled={isChangingPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Digite a nova senha (mín. 8 caracteres)"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  disabled={isChangingPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirme a nova senha"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  disabled={isChangingPassword}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Alterar Senha'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                  disabled={isChangingPassword}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
