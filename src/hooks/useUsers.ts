import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, useAuth } from '@/contexts/AuthContext';

export class PasswordResetError extends Error {
  code?: string;
  errorEn?: string;

  constructor(message: string, code?: string, errorEn?: string) {
    super(message);
    this.name = 'PasswordResetError';
    this.code = code;
    this.errorEn = errorEn;
  }
}

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
  ai_assistant_enabled: boolean;
  can_view_customer_feedback: boolean;
  can_view_complaints: boolean;
  can_view_suggestions: boolean;
  job_title?: string | null;
  direct_manager_id?: string | null;
  created_at: string;
  roles: AppRole[];
}

export function useUsers(opts?: { companyId?: string | null; isSuperAdmin?: boolean }) {
  const companyId = opts?.companyId ?? null;
  const isSuperAdmin = opts?.isSuperAdmin ?? false;
  const { user } = useAuth();

  return useQuery({
    queryKey: ['users', isSuperAdmin ? 'all' : (companyId || 'none')],
    enabled: !!user,
    queryFn: async () => {
      // Fetch all profiles (RLS allows admins to see all)
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

      // Filter by workspace membership unless super admin
      let allowedUserIds: Set<string> | null = null;
      if (!isSuperAdmin && companyId) {
        const { data: members, error: membersError } = await supabase
          .from('company_users')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('is_active', true);
        if (membersError) throw membersError;
        allowedUserIds = new Set((members || []).map((m: any) => m.user_id));
      }

      const filtered = allowedUserIds
        ? profiles.filter(p => allowedUserIds!.has(p.user_id))
        : profiles;

      return filtered.map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
        branch_id: p.branch_id,
        region_id: p.region_id,
        is_active: p.is_active,
        ai_assistant_enabled: p.ai_assistant_enabled ?? false,
        can_view_customer_feedback: (p as any).can_view_customer_feedback ?? false,
        can_view_complaints: (p as any).can_view_complaints ?? false,
        can_view_suggestions: (p as any).can_view_suggestions ?? false,
        job_title: (p as any).job_title ?? null,
        direct_manager_id: (p as any).direct_manager_id ?? null,
        created_at: p.created_at,
        roles: rolesByUser.get(p.user_id) || [],
      })) as UserWithRole[];
    },
  });
}

export function useUserStats(opts?: { companyId?: string | null; isSuperAdmin?: boolean }) {
  const { data: users } = useUsers(opts);

  return {
    total: users?.length || 0,
    admins: users?.filter(u => u.roles.includes('admin')).length || 0,
    active: users?.filter(u => u.is_active).length || 0,
    inactive: users?.filter(u => !u.is_active).length || 0,
  };
}

// Backward-compat overload signature kept inert: existing useUserStats() callers without opts will return zeros until upgraded.
export function useUserStatsLegacy() {
  return useUserStats();
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, fullName, role, companyId }: { email: string; fullName: string; role: AppRole; companyId?: string }) => {
      const response = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, role, companyId },
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
    mutationFn: async ({ email, fullName, password, role, forcePasswordChange, branchId, companyId, superAdminScope, phone, jobTitle, directManagerId }: {
      email: string; fullName: string; password: string; role: AppRole; forcePasswordChange: boolean; branchId?: string; companyId?: string; superAdminScope?: 'all' | 'food' | 'medical'; phone?: string; jobTitle?: string; directManagerId?: string;
    }) => {
      // Use direct fetch to avoid supabase-js logging non-2xx responses to console
      // (which would otherwise trigger the runtime error overlay).
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, fullName, password, role, forcePasswordChange, branchId, companyId, superAdminScope, phone, jobTitle, directManagerId }),
      });
      let body: any = null;
      try { body = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        const err: any = new Error(body?.error || `Request failed (${res.status})`);
        err.code = body?.code;
        err.companies = body?.companies;
        throw err;
      }
      return body;
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
      // Use direct fetch to avoid supabase-js logging non-2xx responses to the
      // runtime error overlay, and to surface the real server error message.
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ userId, email, customPassword }),
      });
      let body: any = null;
      try { body = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        throw new PasswordResetError(body?.error || `Request failed (${res.status})`, body?.code, body?.error_en);
      }
      return body;
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

export function useToggleAIAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_assistant_enabled: enabled } as any)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useToggleFeatureAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, feature, enabled }: { userId: string; feature: 'can_view_customer_feedback' | 'can_view_complaints' | 'can_view_suggestions'; enabled: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ [feature]: enabled } as any)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
