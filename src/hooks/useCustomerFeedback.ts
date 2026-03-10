import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeedbackQuestion {
  id: string;
  question_text: string;
  question_text_ar: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CustomerFeedback {
  id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string;
  overall_rating: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  branch?: { name: string; name_ar: string | null };
  scores?: FeedbackScore[];
}

export interface FeedbackScore {
  id: string;
  feedback_id: string;
  question_id: string;
  score: number;
  question?: FeedbackQuestion;
}

export interface CustomerComplaint {
  id: string;
  feedback_id: string;
  branch_id: string;
  complaint_text: string;
  type: string;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  branch?: { name: string; name_ar: string | null };
  feedback?: { customer_name: string; customer_phone: string };
}

// Fetch active questions (public)
export function useFeedbackQuestions() {
  return useQuery({
    queryKey: ['feedback-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_feedback_questions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as FeedbackQuestion[];
    },
  });
}

// Submit feedback (public, no auth)
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (params: {
      branchId: string;
      customerName: string;
      customerPhone: string;
      scores: { questionId: string; score: number }[];
      complaintText?: string;
      suggestionText?: string;
    }) => {
      // Calculate overall rating
      const totalScore = params.scores.reduce((sum, s) => sum + s.score, 0);
      const overallRating = totalScore / params.scores.length;

      // Insert feedback
      const { data: feedback, error: feedbackError } = await supabase
        .from('customer_feedbacks')
        .insert({
          branch_id: params.branchId,
          customer_name: params.customerName,
          customer_phone: params.customerPhone,
          overall_rating: overallRating,
        })
        .select()
        .single();
      if (feedbackError) throw feedbackError;

      // Insert scores
      const scoreRows = params.scores.map(s => ({
        feedback_id: feedback.id,
        question_id: s.questionId,
        score: s.score,
      }));
      const { error: scoresError } = await supabase
        .from('customer_feedback_scores')
        .insert(scoreRows);
      if (scoresError) throw scoresError;

      // Insert complaint if provided
      if (params.complaintText?.trim()) {
        const { error: complaintError } = await supabase
          .from('customer_complaints')
          .insert({
            feedback_id: feedback.id,
            branch_id: params.branchId,
            complaint_text: params.complaintText.trim(),
            type: 'complaint',
          });
        if (complaintError) throw complaintError;
      }

      // Insert suggestion if provided
      if (params.suggestionText?.trim()) {
        const { error: suggestionError } = await supabase
          .from('customer_complaints')
          .insert({
            feedback_id: feedback.id,
            branch_id: params.branchId,
            complaint_text: params.suggestionText.trim(),
            type: 'suggestion',
          });
        if (suggestionError) throw suggestionError;
      }

      return feedback;
    },
  });
}

// Fetch feedbacks for internal use (authenticated)
export function useCustomerFeedbacks(branchId?: string) {
  return useQuery({
    queryKey: ['customer-feedbacks', branchId],
    queryFn: async () => {
      let query = supabase
        .from('customer_feedbacks')
        .select('*, branch:branches(name, name_ar)')
        .order('created_at', { ascending: false });
      if (branchId) query = query.eq('branch_id', branchId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerFeedback[];
    },
  });
}

// Fetch feedback detail with scores
export function useCustomerFeedbackDetail(feedbackId: string | undefined) {
  return useQuery({
    queryKey: ['customer-feedback-detail', feedbackId],
    enabled: !!feedbackId,
    queryFn: async () => {
      const { data: feedback, error: fError } = await supabase
        .from('customer_feedbacks')
        .select('*, branch:branches(name, name_ar)')
        .eq('id', feedbackId!)
        .single();
      if (fError) throw fError;

      const { data: scores, error: sError } = await supabase
        .from('customer_feedback_scores')
        .select('*, question:customer_feedback_questions(*)')
        .eq('feedback_id', feedbackId!);
      if (sError) throw sError;

      return { ...feedback, scores } as CustomerFeedback;
    },
  });
}

// Fetch complaints (authenticated)
export function useCustomerComplaints(branchId?: string) {
  return useQuery({
    queryKey: ['customer-complaints', branchId],
    queryFn: async () => {
      let query = supabase
        .from('customer_complaints')
        .select('*, branch:branches(name, name_ar), feedback:customer_feedbacks(customer_name, customer_phone)')
        .order('created_at', { ascending: false });
      if (branchId) query = query.eq('branch_id', branchId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerComplaint[];
    },
  });
}

// Update complaint status
export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      status?: string;
      assigned_to?: string;
      resolution_notes?: string;
      resolved_by?: string;
      resolved_at?: string;
    }) => {
      const { error } = await supabase
        .from('customer_complaints')
        .update(params)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-complaints'] });
    },
  });
}

// Check if phone already submitted today for this branch
export function useCheckDailyLimit(branchId: string, phone: string) {
  return useQuery({
    queryKey: ['feedback-daily-check', branchId, phone],
    enabled: !!branchId && phone.length >= 9,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('customer_feedbacks')
        .select('id')
        .eq('branch_id', branchId)
        .eq('customer_phone', phone)
        .gte('created_at', today.toISOString())
        .limit(1);
      if (error) throw error;
      return data.length > 0;
    },
  });
}
