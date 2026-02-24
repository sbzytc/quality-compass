import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/contexts/AuthContext';

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  branch_id?: string;
  region_id?: string;
  is_active: boolean;
  created_at: string;
  roles: AppRole[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Group roles by user_id
      const rolesByUser = new Map<string, AppRole[]>();
      roles.forEach(r => {
        const list = rolesByUser.get(r.user_id) || [];
        list.push(r.role as AppRole);
        rolesByUser.set(r.user_id, list);
      });

      return profiles.map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
        branch_id: p.branch_id,
        region_id: p.region_id,
        is_active: p.is_active,
        created_at: p.created_at,
        roles: rolesByUser.get(p.user_id) || [],
      })) as UserWithRole[];
    },
  });
}

export function useUserStats() {
  const { data: users } = useUsers();

  return {
    total: users?.length || 0,
    admins: users?.filter(u => u.roles.includes('admin')).length || 0,
    active: users?.filter(u => u.is_active).length || 0,
    inactive: users?.filter(u => !u.is_active).length || 0,
  };
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: AppRole }) => {
      const response = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, role },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, fullName, password, role, forcePasswordChange, branchId }: { 
      email: string; fullName: string; password: string; role: AppRole; forcePasswordChange: boolean; branchId?: string 
    }) => {
      const response = await supabase.functions.invoke('create-user', {
        body: { email, fullName, password, role, forcePasswordChange, branchId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('resend-invitation', {
        body: { userId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ userId, email, customPassword }: { userId: string; email: string; customPassword?: string }) => {
      const response = await supabase.functions.invoke('reset-user-password', {
        body: { userId, email, customPassword },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // First, delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Then, insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useAssignBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, branchId }: { userId: string; branchId: string }) => {
      // Update profile's branch_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ branch_id: branchId })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Clear old branch manager_id if user was assigned to another branch
      const { error: clearError } = await supabase
        .from('branches')
        .update({ manager_id: null })
        .eq('manager_id', userId);

      if (clearError) throw clearError;

      // Set new branch's manager_id
      const { error: branchError } = await supabase
        .from('branches')
        .update({ manager_id: userId })
        .eq('id', branchId);

      if (branchError) throw branchError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}
