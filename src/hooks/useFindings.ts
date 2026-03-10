import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useSystemLogs';

export interface Finding {
  id: string;
  evaluationId: string;
  branchId: string;
  branchName: string;
  branchNameAr?: string;
  criterionId: string;
  criterionName: string;
  criterionNameAr?: string;
  categoryName: string;
  categoryNameAr?: string;
  score: number;
  maxScore: number;
  assessorNotes?: string;
  attachments: string[];
  status: 'open' | 'in_progress' | 'pending_manager_review' | 'pending_review' | 'resolved' | 'rejected';
  assignedTo?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  evaluationDate?: string;
  // Review workflow fields
  resolutionNotes?: string;
  resolutionAttachments?: string[];
  rejectionReason?: string;
  reviewAttachments?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  assessorId?: string; // the evaluator who created the finding
}

export interface CorrectiveAction {
  id: string;
  nonConformityId: string;
  description: string;
  ownerId?: string;
  ownerName?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  evidence: string[];
  completedAt?: string;
  createdAt: string;
}

function mapFinding(f: any): Finding {
  return {
    id: f.id,
    evaluationId: f.evaluation_id,
    branchId: f.branch_id,
    branchName: (f.branches as any)?.name || 'Unknown',
    branchNameAr: (f.branches as any)?.name_ar,
    criterionId: f.criterion_id,
    criterionName: (f.template_criteria as any)?.name || 'Unknown',
    criterionNameAr: (f.template_criteria as any)?.name_ar,
    categoryName: (f.template_criteria as any)?.template_categories?.name || 'Unknown',
    categoryNameAr: (f.template_criteria as any)?.template_categories?.name_ar,
    score: f.score,
    maxScore: f.max_score,
    assessorNotes: f.assessor_notes,
    attachments: f.attachments || [],
    status: f.status as Finding['status'],
    assignedTo: f.assigned_to,
    dueDate: f.due_date,
    resolvedAt: f.resolved_at,
    resolvedBy: f.resolved_by,
    createdAt: f.created_at,
    evaluationDate: (f.evaluations as any)?.submitted_at || (f.evaluations as any)?.created_at,
    resolutionNotes: f.resolution_notes,
    resolutionAttachments: f.resolution_attachments || [],
    rejectionReason: f.rejection_reason,
    reviewAttachments: f.review_attachments || [],
    reviewedBy: f.reviewed_by,
    reviewedAt: f.reviewed_at,
    assessorId: (f.evaluations as any)?.assessor_id,
  };
}

const FINDINGS_SELECT = `
  *,
  branches:branch_id (name, name_ar),
  template_criteria:criterion_id (
    name,
    name_ar,
    template_categories!inner (name, name_ar)
  ),
  evaluations!inner (status, is_archived, submitted_at, created_at, assessor_id)
`;

export function useFindings(filters?: { status?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['findings', filters],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select(FINDINGS_SELECT)
        .in('evaluations.status', ['submitted', 'approved'])
        .eq('evaluations.is_archived', false)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapFinding) as Finding[];
    },
  });
}

// Critical findings: score 0-3 (out of 5), grouped by branch
export function useCriticalFindings(filters?: { status?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['critical-findings', filters],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select(FINDINGS_SELECT)
        .in('evaluations.status', ['submitted', 'approved'])
        .eq('evaluations.is_archived', false)
        .lte('score', 3)
        .order('score', { ascending: true })
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapFinding) as Finding[];
    },
  });
}

export function useFindingStats() {
  return useQuery({
    queryKey: ['finding-stats'],
    queryFn: async () => {
      const { data: allFindings, error } = await supabase
        .from('non_conformities')
        .select('status, score, assigned_to, due_date, resolved_at, created_at, evaluations!inner(status, is_archived)')
        .lte('score', 3)
        .in('evaluations.status', ['submitted', 'approved'])
        .eq('evaluations.is_archived', false);

      if (error) throw error;

      const open = allFindings.filter(f => f.status === 'open').length;
      const inProgress = allFindings.filter(f => f.status === 'in_progress' || f.status === 'rejected').length;
      const pendingManagerReview = allFindings.filter(f => f.status === 'pending_manager_review').length;
      const pendingReview = allFindings.filter(f => f.status === 'pending_review').length;
      const resolved = allFindings.filter(f => f.status === 'resolved').length;
      const rejected = allFindings.filter(f => f.status === 'rejected').length;
      const total = allFindings.length;

      const assigned = allFindings.filter(f => f.assigned_to).length;
      const unassigned = allFindings.filter(f => !f.assigned_to && !['resolved', 'pending_review', 'pending_manager_review'].includes(f.status)).length;

      const now = new Date();
      const overdue = allFindings.filter(f => 
        f.due_date && new Date(f.due_date) < now && !['resolved'].includes(f.status)
      ).length;

      const resolvedFindings = allFindings.filter(f => f.resolved_at);
      let avgResolutionDays = 0;
      if (resolvedFindings.length > 0) {
        const totalDays = resolvedFindings.reduce((sum, f) => {
          const created = new Date(f.created_at).getTime();
          const resolvedDate = new Date(f.resolved_at!).getTime();
          return sum + (resolvedDate - created) / (1000 * 60 * 60 * 24);
        }, 0);
        avgResolutionDays = Math.round(totalDays / resolvedFindings.length);
      }

      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      return {
        open,
        inProgress,
        pendingManagerReview,
        pendingReview,
        resolved,
        rejected,
        total,
        assigned,
        unassigned,
        overdue,
        avgResolutionDays,
        resolutionRate,
      };
    },
  });
}

export function useAssignFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ findingId, assignedTo, dueDate }: { findingId: string; assignedTo: string; dueDate: string }) => {
      const { error } = await supabase
        .from('non_conformities')
        .update({
          assigned_to: assignedTo,
          due_date: dueDate,
          status: 'in_progress',
        })
        .eq('id', findingId);

      if (error) throw error;

      // Log history
      await supabase.from('non_conformity_history').insert({
        non_conformity_id: findingId,
        action: 'assigned',
        performed_by: user!.id,
        notes: `Assigned to user, due: ${dueDate}`,
      });
      // Auto-create corrective action
      const { data: finding } = await supabase
        .from('non_conformities')
        .select('score, template_criteria:criterion_id (name)')
        .eq('id', findingId)
        .single();

      const priority = finding?.score === 0 ? 'critical' : finding?.score === 1 ? 'high' : finding?.score === 2 ? 'medium' : 'low';
      const criterionName = (finding?.template_criteria as any)?.name || 'Finding';

      await supabase.from('corrective_actions').insert({
        non_conformity_id: findingId,
        description: `Corrective action for: ${criterionName}`,
        owner_id: assignedTo,
        due_date: dueDate,
        priority,
        status: 'pending',
      });

      // Create notification for assigned user
      await supabase.from('notifications').insert({
        user_id: assignedTo,
        title: 'New Finding Assigned',
        message: 'A critical finding has been assigned to you for resolution.',
        type: 'assignment',
        reference_type: 'finding',
        reference_id: findingId,
      });

      // System log
      await logAction('assigned', 'finding', findingId, { assignedTo, dueDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-action-stats'] });
    },
  });
}

/**
 * Resolve a finding.
 * - If resolvedByManager=true: BM resolves directly → pending_review (assessor reviews)
 * - If resolvedByManager=false: Employee resolves → pending_manager_review (BM reviews first)
 */
export function useResolveFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ findingId, assessorId, resolution, attachments, resolvedByManager, branchManagerId }: { 
      findingId: string; 
      assessorId?: string; 
      resolution: string; 
      attachments?: string[];
      resolvedByManager?: boolean;
      branchManagerId?: string;
    }) => {
      const targetStatus = resolvedByManager ? 'pending_review' : 'pending_manager_review';
      
      const updateData: any = {
        status: targetStatus,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        resolution_notes: resolution,
      };
      if (attachments && attachments.length > 0) {
        updateData.resolution_attachments = attachments;
      }
      const { error } = await supabase
        .from('non_conformities')
        .update(updateData)
        .eq('id', findingId);

      if (error) throw error;

      // Log history
      await supabase.from('non_conformity_history').insert({
        non_conformity_id: findingId,
        action: 'resolved',
        performed_by: user!.id,
        notes: resolution,
        attachments: attachments || null,
      });
      
      // Update corrective action status
      const { data: existingCA } = await supabase
        .from('corrective_actions')
        .select('id')
        .eq('non_conformity_id', findingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingCA && existingCA.length > 0) {
        await supabase.from('corrective_actions').update({ status: 'in_progress' }).eq('id', existingCA[0].id);
      } else {
        // Direct resolve without assignment — create corrective action
        const { data: finding } = await supabase
          .from('non_conformities')
          .select('score, template_criteria:criterion_id (name)')
          .eq('id', findingId)
          .single();
        const priority = finding?.score === 0 ? 'critical' : finding?.score === 1 ? 'high' : finding?.score === 2 ? 'medium' : 'low';
        const criterionName = (finding?.template_criteria as any)?.name || 'Finding';
        await supabase.from('corrective_actions').insert({
          non_conformity_id: findingId,
          description: `Corrective action for: ${criterionName}`,
          owner_id: user?.id,
          priority,
          status: 'in_progress',
        });
      }

      if (resolvedByManager) {
        // BM resolved directly → notify assessor
        if (assessorId) {
          await supabase.from('notifications').insert({
            user_id: assessorId,
            title: 'Finding Ready for Review',
            message: 'A finding fix has been submitted and is awaiting your review.',
            type: 'review_pending',
            reference_type: 'finding',
            reference_id: findingId,
          });
        }
      } else {
        // Employee resolved → notify branch manager
        if (branchManagerId) {
          await supabase.from('notifications').insert({
            user_id: branchManagerId,
            title: 'Finding Fix Submitted',
            message: 'An employee has submitted a fix for a finding. Please review and approve or reject.',
            type: 'manager_review_pending',
            reference_type: 'finding',
            reference_id: findingId,
          });
        }
      }

      // System log
      const statusDesc = resolvedByManager ? 'resolved_by_manager' : 'resolved_by_employee';
      await logAction('resolved', 'finding', findingId, { resolution, resolvedByManager, status: statusDesc });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['all-corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-action-stats'] });
    },
  });
}

/**
 * Branch Manager approves employee's resolution → moves to pending_review (assessor)
 */
export function useManagerApproveFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ findingId, assessorId, notes, attachments }: { 
      findingId: string; 
      assessorId?: string;
      notes?: string; 
      attachments?: string[] 
    }) => {
      const { error } = await supabase
        .from('non_conformities')
        .update({ status: 'pending_review' })
        .eq('id', findingId);

      if (error) throw error;

      // Log history
      await supabase.from('non_conformity_history').insert({
        non_conformity_id: findingId,
        action: 'manager_approved',
        performed_by: user!.id,
        notes: notes || 'Manager approved the fix',
        attachments: attachments || null,
      });

      // Notify the assessor
      if (assessorId) {
        await supabase.from('notifications').insert({
          user_id: assessorId,
          title: 'Finding Ready for Review',
          message: 'A finding fix has been approved by the branch manager and is awaiting your review.',
          type: 'review_pending',
          reference_type: 'finding',
          reference_id: findingId,
        });
      }

      await logAction('manager_approved', 'finding', findingId, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Branch Manager rejects employee's resolution → back to rejected status
 */
export function useManagerRejectFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ findingId, reason, attachments, assignedTo }: { 
      findingId: string; 
      reason: string; 
      attachments?: string[];
      assignedTo?: string;
    }) => {
      const updateData: any = {
        status: 'rejected',
        rejection_reason: reason,
        resolved_at: null,
        resolved_by: null,
      };
      if (attachments && attachments.length > 0) updateData.review_attachments = attachments;

      const { error } = await supabase
        .from('non_conformities')
        .update(updateData)
        .eq('id', findingId);

      if (error) throw error;

      // Log history
      await supabase.from('non_conformity_history').insert({
        non_conformity_id: findingId,
        action: 'manager_rejected',
        performed_by: user!.id,
        notes: reason,
        attachments: attachments || null,
      });

      // Notify the assigned employee
      if (assignedTo) {
        await supabase.from('notifications').insert({
          user_id: assignedTo,
          title: 'Finding Fix Rejected by Manager',
          message: `Your fix was rejected. Reason: ${reason}`,
          type: 'rejection',
          reference_type: 'finding',
          reference_id: findingId,
        });
      }

      await logAction('manager_rejected', 'finding', findingId, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Assessor approves a finding fix (from pending_review → resolved)
 */
export function useApproveFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ findingId, notes, attachments }: { findingId: string; notes?: string; attachments?: string[] }) => {
      const updateData: any = {
        status: 'resolved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (notes) updateData.assessor_notes = notes;
      if (attachments && attachments.length > 0) updateData.review_attachments = attachments;

      const { error } = await supabase
        .from('non_conformities')
        .update(updateData)
        .eq('id', findingId);

      if (error) throw error;

      // Log history
      await supabase.from('non_conformity_history').insert({
        non_conformity_id: findingId,
        action: 'approved',
        performed_by: user!.id,
        notes: notes || null,
        attachments: attachments || null,
      });
      const { data: existingCA } = await supabase
        .from('corrective_actions')
        .select('id')
        .eq('non_conformity_id', findingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingCA && existingCA.length > 0) {
        await supabase.from('corrective_actions').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', existingCA[0].id);
      }

      await logAction('approved', 'finding', findingId, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['all-corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-action-stats'] });
    },
  });
}

/**
 * Assessor rejects a finding fix → back to rejected, notify employee + BM
 */
export function useRejectFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ findingId, reason, attachments, assignedTo, branchManagerId }: { 
      findingId: string; 
      reason: string; 
      attachments?: string[]; 
      assignedTo?: string;
      branchManagerId?: string;
    }) => {
      const updateData: any = {
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
        resolved_at: null,
        resolved_by: null,
      };
      if (attachments && attachments.length > 0) updateData.review_attachments = attachments;

      const { error } = await supabase
        .from('non_conformities')
        .update(updateData)
        .eq('id', findingId);

      if (error) throw error;

      // Log history
      await supabase.from('non_conformity_history').insert({
        non_conformity_id: findingId,
        action: 'rejected',
        performed_by: user!.id,
        notes: reason,
        attachments: attachments || null,
      });

      // Notify the assigned employee
      if (assignedTo) {
        await supabase.from('notifications').insert({
          user_id: assignedTo,
          title: 'Finding Fix Rejected',
          message: `Your fix was rejected by the assessor. Reason: ${reason}`,
          type: 'rejection',
          reference_type: 'finding',
          reference_id: findingId,
        });
      }

      // Notify the branch manager
      if (branchManagerId) {
        await supabase.from('notifications').insert({
          user_id: branchManagerId,
          title: 'Finding Fix Rejected by Assessor',
          message: `A finding fix was rejected by the assessor. Reason: ${reason}`,
          type: 'rejection',
          reference_type: 'finding',
          reference_id: findingId,
        });
      }

      await logAction('rejected', 'finding', findingId, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['all-corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-action-stats'] });
    },
  });
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCorrectiveActions(findingId?: string) {
  return useQuery({
    queryKey: ['corrective-actions', findingId],
    queryFn: async () => {
      let query = supabase
        .from('corrective_actions')
        .select('*')
        .order('created_at', { ascending: false });

      if (findingId) {
        query = query.eq('non_conformity_id', findingId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(a => ({
        id: a.id,
        nonConformityId: a.non_conformity_id,
        description: a.description,
        ownerId: a.owner_id,
        dueDate: a.due_date,
        priority: a.priority as CorrectiveAction['priority'],
        status: a.status as CorrectiveAction['status'],
        evidence: a.evidence || [],
        completedAt: a.completed_at,
        createdAt: a.created_at,
      })) as CorrectiveAction[];
    },
    enabled: findingId !== undefined,
  });
}

export function usePendingActions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pending-actions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          *,
          non_conformities!inner (
            branch_id,
            branches:branch_id (manager_id)
          )
        `)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export interface FindingHistoryEntry {
  id: string;
  action: string;
  performedBy: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
}

export function useFindingHistory(findingId?: string) {
  return useQuery({
    queryKey: ['finding-history', findingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_conformity_history')
        .select('*')
        .eq('non_conformity_id', findingId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data.map((h: any) => ({
        id: h.id,
        action: h.action,
        performedBy: h.performed_by,
        notes: h.notes,
        attachments: h.attachments,
        createdAt: h.created_at,
      })) as FindingHistoryEntry[];
    },
    enabled: !!findingId,
  });
}
