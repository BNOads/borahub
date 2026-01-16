import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  display_name?: string;
  avatar_url?: string;
  role: 'admin' | 'collaborator';
  department?: string;
  job_title?: string;
  phone?: string;
  birth_date?: string;
  hire_date?: string;
  bio?: string;
  is_active: boolean;
  must_change_password: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  notification_settings?: any;
  favorite_tools?: string[];
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = profile?.role === 'admin' && profile?.is_active;

  // Função para buscar o perfil do usuário com timeout
  const fetchProfile = async (userId: string) => {
    console.log('fetchProfile: Starting for userId:', userId);
    try {
      console.log('fetchProfile: Querying Supabase...');

      // Adiciona timeout de 10 segundos para evitar travamento
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('fetchProfile: Query result:', { data: !!data, error });

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (data) {
        console.log('fetchProfile: Setting profile data');
        setProfile(data as Profile);
        return data as Profile;
      } else {
        console.warn('Nenhum perfil encontrado para o usuário');
        return null;
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Função para registrar atividade
  const logActivity = async (action: string, entityType: string, entityId?: string, details?: any) => {
    try {
      await supabase.rpc('log_activity', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_details: details
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Função de login
  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);

        // Verifica se a conta está ativa
        if (userProfile && !userProfile.is_active) {
          await supabase.auth.signOut();
          throw new Error('Conta desativada. Entre em contato com o administrador.');
        }

        // Atualiza o último login
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);

        // Registra atividade de login
        await logActivity('login', 'auth');

        // Configura sessão com remember me
        if (rememberMe) {
          await supabase.auth.setSession({
            access_token: data.session!.access_token,
            refresh_token: data.session!.refresh_token,
          });
        }

        toast({
          title: 'Login realizado com sucesso!',
          description: `Bem-vindo, ${userProfile?.display_name || userProfile?.full_name}!`,
        });
      }
    } catch (error: any) {
      console.error('Error signing in:', error);

      let errorMessage = 'Email ou senha incorretos';
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado';
      } else if (error.message?.includes('desativada')) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro ao fazer login',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;
    }
  };

  // Função de logout
  const signOut = async () => {
    try {
      // Registra atividade de logout
      await logActivity('logout', 'auth');

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setSession(null);

      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Erro ao fazer logout',
        description: 'Ocorreu um erro ao sair da conta.',
        variant: 'destructive',
      });
    }
  };

  // Função para atualizar senha
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user?.email) throw new Error('Usuário não autenticado');

      // Se não for troca obrigatória, verifica senha atual
      if (currentPassword && !profile?.must_change_password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) throw new Error('Senha atual incorreta');
      }

      // Atualiza para nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Remove flag de must_change_password
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id);

      // Registra atividade
      await logActivity('password_change', 'auth');

      await refreshProfile();

      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi alterada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: 'Erro ao atualizar senha',
        description: error.message || 'Ocorreu um erro ao atualizar a senha.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Função para atualizar perfil
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      // Remove campos que não podem ser atualizados pelo próprio usuário
      const { role, is_active, ...safeUpdates } = updates;

      const { error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', user.id);

      if (error) throw error;

      // Atualiza o estado local imediatamente
      setProfile(prev => prev ? { ...prev, ...safeUpdates } : null);

      // Recarrega o perfil em background (sem awaitar)
      refreshProfile().catch(err => console.error('Error refreshing profile:', err));

      // Registra atividade
      logActivity('user_updated', 'user', user.id, { updates: safeUpdates }).catch(err => 
        console.error('Error logging activity:', err)
      );

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message || 'Ocorreu um erro ao atualizar o perfil.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Função para recarregar perfil
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Monitorar mudanças na autenticação
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('AuthContext: Starting initialization...');
      try {
        console.log('AuthContext: Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthContext: Got session:', { hasSession: !!session, error });

        if (!isMounted) return;

        // Se houver erro de token inválido, limpa a sessão
        if (error) {
          console.error('Session error:', error);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('AuthContext: Fetching profile for user:', session.user.id);
          await fetchProfile(session.user.id);
          console.log('AuthContext: Profile fetched');
        } else {
          console.log('AuthContext: No session, skipping profile fetch');
        }
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        // Em caso de erro, limpa tudo
        if (error.message?.includes('Refresh Token') || error.message?.includes('JWT')) {
          await supabase.auth.signOut();
        }
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        console.log('AuthContext: Initialization complete, setting isLoading to false');
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Se o token expirou ou foi invalidado, limpa tudo
      if (event === 'TOKEN_REFRESHED' && !session) {
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAdmin,
    signIn,
    signOut,
    updatePassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
