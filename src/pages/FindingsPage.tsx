import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, AlertTriangle, Clock, CheckCircle2, Target,
  UserPlus, Calendar, TrendingUp, Building2, ChevronDown,
  ChevronRight, AlertCircle, Timer, BarChart3, Camera, X, Eye, XCircle, ThumbsUp, ThumbsDown,
  History, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCriticalFindings, useFindingStats, useAssignFinding, useResolveFinding, useApproveFinding, useRejectFinding, useManagerApproveFinding, useManagerRejectFinding, useFindingHistory, Finding } from '@/hooks/useFindings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function FindingsPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/dashboard/ceo');
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveImages, setResolveImages] = useState<File[]>([]);
  const [resolveImagePreviews, setResolveImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const resolveFileInputRef = useRef<HTMLInputElement>(null);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewFinding, setViewFinding] = useState<Finding | null>(null);
  // Track if review is manager review or assessor review
  const [isManagerReview, setIsManagerReview] = useState(false);

  const { user, roles } = useAuth();
  const statusFilter = activeTab !== 'all' ? activeTab : undefined;
  const { data: findings, isLoading: findingsLoading } = useCriticalFindings(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: stats, isLoading: statsLoading } = useFindingStats();
  const { data: users } = useUsers();
  // Fetch raw branches for manager_id lookup
  const { data: rawBranches } = useQuery({
    queryKey: ['branches-raw'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, manager_id');
      if (error) throw error;
      return data;
    },
  });
  const assignMutation = useAssignFinding();
  const resolveMutation = useResolveFinding();
  const approveMutation = useApproveFinding();
  const rejectMutation = useRejectFinding();
  const managerApproveMutation = useManagerApproveFinding();
  const managerRejectMutation = useManagerRejectFinding();
  const { data: findingHistory, isLoading: historyLoading } = useFindingHistory(
    (viewDialogOpen && viewFinding?.id) || (resolveDialogOpen && selectedFinding?.id) || undefined
  );
  const isLoading = findingsLoading || statsLoading;

  const isAdmin = roles.includes('admin');
  const isBranchManager = roles.includes('branch_manager');
  const isAssessor = roles.includes('assessor');
  const isBranchEmployee = roles.includes('branch_employee');
  const isExecutive = roles.includes('executive');
  const isSupportAgent = roles.includes('support_agent');

  // Group findings by branch
  const branchGroups = useMemo(() => {
    if (!findings) return [];
    const groups = new Map<string, { branchId: string; branchName: string; findings: Finding[]; earliestDate: string }>();
    findings.forEach(f => {
      const name = isAr ? (f.branchNameAr || f.branchName) : f.branchName;
      if (!groups.has(f.branchId)) {
        groups.set(f.branchId, { branchId: f.branchId, branchName: name, findings: [], earliestDate: f.evaluationDate || f.createdAt });
      }
      const group = groups.get(f.branchId)!;
      group.findings.push(f);
      const findingDate = f.evaluationDate || f.createdAt;
      if (findingDate < group.earliestDate) {
        group.earliestDate = findingDate;
      }
    });
    return Array.from(groups.values()).sort((a, b) => b.findings.length - a.findings.length);
  }, [findings, isAr]);

  const toggleBranch = (branchId: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev);
      next.has(branchId) ? next.delete(branchId) : next.add(branchId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedBranches(new Set(branchGroups.map(g => g.branchId)));
  };

  // Get branch manager for a branch
  const getBranchManagerId = (branchId: string): string | undefined => {
    return branches?.find(b => b.id === branchId)?.manager_id || undefined;
  };

  const handleAssign = (finding: Finding) => {
    setSelectedFinding(finding);
    setAssignUserId(finding.assignedTo || '');
    setAssignDueDate(finding.dueDate || '');
    setAssignDialogOpen(true);
  };

  // Get branch employees for assignment dialog
  const getBranchEmployees = (branchId: string) => {
    if (!users) return [];
    return users.filter(u => 
      u.is_active && 
      u.branch_id === branchId && 
      (u.roles.includes('branch_employee') || u.roles.includes('branch_manager'))
    );
  };

  const submitAssignment = async () => {
    if (!selectedFinding || !assignUserId || !assignDueDate) return;
    try {
      await assignMutation.mutateAsync({
        findingId: selectedFinding.id,
        assignedTo: assignUserId,
        dueDate: assignDueDate,
      });
      toast.success(isAr ? 'تم تعيين الملاحظة بنجاح' : 'Finding assigned successfully');
      setAssignDialogOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to assign finding');
    }
  };

  const handleResolve = (finding: Finding) => {
    setSelectedFinding(finding);
    setResolveNotes('');
    setResolveImages([]);
    setResolveImagePreviews([]);
    setResolveDialogOpen(true);
  };

  const handleResolveImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error(isAr ? 'بعض الملفات تجاوزت 5MB' : 'Some files exceed 5MB limit');
    }
    setResolveImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setResolveImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
    if (resolveFileInputRef.current) resolveFileInputRef.current.value = '';
  };

  const removeResolveImage = (index: number) => {
    setResolveImages(prev => prev.filter((_, i) => i !== index));
    setResolveImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const submitResolve = async () => {
    if (!selectedFinding || !resolveNotes.trim()) return;
    try {
      setIsUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of resolveImages) {
        const ext = file.name.split('.').pop();
        const path = `findings/${selectedFinding.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('evaluation-attachments')
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('evaluation-attachments')
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const resolvedByManager = isBranchManager && !isBranchEmployee;
      const branchManagerId = getBranchManagerId(selectedFinding.branchId);

      await resolveMutation.mutateAsync({
        findingId: selectedFinding.id,
        assessorId: selectedFinding.assessorId,
        resolution: resolveNotes.trim(),
        attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        resolvedByManager,
        branchManagerId,
      });
      toast.success(
        resolvedByManager 
          ? (isAr ? 'تم إرسال الإصلاح للمقيّم' : 'Fix submitted to assessor')
          : (isAr ? 'تم إرسال الإصلاح لمدير الفرع' : 'Fix submitted to branch manager')
      );
      setResolveDialogOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to resolve finding');
    } finally {
      setIsUploading(false);
    }
  };

  // Review handlers (for both manager review and assessor review)
  const handleReview = (finding: Finding, action: 'approve' | 'reject', managerReview: boolean = false) => {
    setSelectedFinding(finding);
    setReviewAction(action);
    setIsManagerReview(managerReview);
    setRejectionReason('');
    setReviewImages([]);
    setReviewImagePreviews([]);
    setReviewDialogOpen(true);
  };

  const handleReviewImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error(isAr ? 'بعض الملفات تجاوزت 5MB' : 'Some files exceed 5MB limit');
    }
    setReviewImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setReviewImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
    if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
  };

  const removeReviewImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
    setReviewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const submitReview = async () => {
    if (!selectedFinding) return;
    if (reviewAction === 'reject' && !rejectionReason.trim()) return;

    try {
      setIsUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of reviewImages) {
        const ext = file.name.split('.').pop();
        const path = `findings/${selectedFinding.id}/review-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('evaluation-attachments')
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('evaluation-attachments')
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      if (isManagerReview) {
        // Manager review flow
        if (reviewAction === 'approve') {
          await managerApproveMutation.mutateAsync({
            findingId: selectedFinding.id,
            assessorId: selectedFinding.assessorId,
            attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          });
          toast.success(isAr ? 'تمت الموافقة وإرسالها للمقيّم' : 'Approved and sent to assessor');
        } else {
          await managerRejectMutation.mutateAsync({
            findingId: selectedFinding.id,
            reason: rejectionReason.trim(),
            attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
            assignedTo: selectedFinding.assignedTo,
          });
          toast.success(isAr ? 'تم رفض الإصلاح وإعادته للموظف' : 'Fix rejected and returned to employee');
        }
      } else {
        // Assessor review flow
        if (reviewAction === 'approve') {
          await approveMutation.mutateAsync({
            findingId: selectedFinding.id,
            attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          });
          toast.success(isAr ? 'تم اعتماد الإصلاح' : 'Fix approved successfully');
        } else {
          const branchManagerId = getBranchManagerId(selectedFinding.branchId);
          await rejectMutation.mutateAsync({
            findingId: selectedFinding.id,
            reason: rejectionReason.trim(),
            attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
            assignedTo: selectedFinding.assignedTo,
            branchManagerId,
          });
          toast.success(isAr ? 'تم رفض الإصلاح' : 'Fix rejected');
        }
      }
      setReviewDialogOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to submit review');
    } finally {
      setIsUploading(false);
    }
  };

  const canReviewFinding = (finding: Finding) => {
    return finding.assessorId === user?.id || isAdmin;
  };

  const getScoreSeverity = (score: number) => {
    if (score === 0) return { label: isAr ? 'حرج' : 'Critical', color: 'bg-score-critical/10 text-score-critical border-score-critical/20' };
    if (score === 1) return { label: isAr ? 'خطير' : 'Severe', color: 'bg-score-critical/10 text-score-critical border-score-critical/20' };
    if (score === 2) return { label: isAr ? 'ضعيف' : 'Weak', color: 'bg-score-weak/10 text-score-weak border-score-weak/20' };
    return { label: isAr ? 'أقل من المتوسط' : 'Below Avg', color: 'bg-score-average/10 text-score-average border-score-average/20' };
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'open': return {
        label: isAr ? 'مفتوح' : 'Open',
        color: 'bg-score-critical/10 text-score-critical border-score-critical/20',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
      };
      case 'in_progress': return {
        label: isAr ? 'قيد المعالجة' : 'In Progress',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: <Timer className="w-3.5 h-3.5" />,
      };
      case 'pending_manager_review': return {
        label: isAr ? 'بانتظار موافقة المدير' : 'Pending Manager',
        color: 'bg-score-average/10 text-score-average border-score-average/20',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
      };
      case 'pending_review': return {
        label: isAr ? 'بانتظار المقيّم' : 'Pending Assessor',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: <Eye className="w-3.5 h-3.5" />,
      };
      case 'resolved': return {
        label: isAr ? 'تم الاعتماد' : 'Approved',
        color: 'bg-score-excellent/10 text-score-excellent border-score-excellent/20',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      };
      case 'rejected': return {
        label: isAr ? 'مرفوض' : 'Rejected',
        color: 'bg-score-critical/10 text-score-critical border-score-critical/20',
        icon: <XCircle className="w-3.5 h-3.5" />,
      };
      default: return { label: status, color: 'bg-muted text-muted-foreground', icon: null };
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId || !users) return isAr ? 'غير معيّن' : 'Unassigned';
    const u = users.find(u => u.user_id === userId);
    return u?.full_name || userId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {isAr ? 'الملاحظات الحرجة' : 'Critical Findings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'معايير التقييم التي حصلت على درجات منخفضة (0-3 من 5) وتحتاج إلى إجراءات تصحيحية' : 'Evaluation criteria that scored low (0-3 out of 5) and need corrective action'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {isLoading ? (
          [...Array(7)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            {[
              { key: 'all', label: isAr ? 'الإجمالي' : 'Total', value: stats?.total || 0, sub: isAr ? 'ملاحظة حرجة' : 'critical findings', icon: <Target className="w-4 h-4" />, style: 'bg-card border-border text-muted-foreground' },
              { key: 'open', label: isAr ? 'مفتوح' : 'Open', value: stats?.open || 0, sub: `${isAr ? 'غير معيّن' : 'unassigned'}: ${stats?.unassigned || 0}`, icon: <AlertTriangle className="w-4 h-4" />, style: 'bg-score-critical/5 border-score-critical/20 text-score-critical' },
              { key: 'in_progress', label: isAr ? 'قيد المعالجة' : 'In Progress', value: stats?.inProgress || 0, sub: isAr ? 'بانتظار الحل' : 'awaiting resolution', icon: <Timer className="w-4 h-4" />, style: 'bg-primary/5 border-primary/20 text-primary' },
              { key: 'pending_manager_review', label: isAr ? 'موافقة المدير' : 'Manager Review', value: stats?.pendingManagerReview || 0, sub: isAr ? 'بانتظار الموافقة' : 'awaiting manager', icon: <ShieldCheck className="w-4 h-4" />, style: 'bg-score-average/5 border-score-average/20 text-score-average' },
              { key: 'pending_review', label: isAr ? 'مراجعة المقيّم' : 'Assessor Review', value: stats?.pendingReview || 0, sub: isAr ? 'بانتظار الاعتماد' : 'awaiting assessor', icon: <Eye className="w-4 h-4" />, style: 'bg-primary/5 border-primary/20 text-primary' },
              { key: 'resolved', label: isAr ? 'تم الاعتماد' : 'Approved', value: stats?.resolved || 0, sub: `${stats?.resolutionRate || 0}% ${isAr ? 'نسبة الحل' : 'resolution rate'}`, icon: <CheckCircle2 className="w-4 h-4" />, style: 'bg-score-excellent/5 border-score-excellent/20 text-score-excellent' },
              { key: 'rejected', label: isAr ? 'مرفوض' : 'Rejected', value: stats?.rejected || 0, sub: isAr ? 'يحتاج إعادة حل' : 'needs re-resolution', icon: <XCircle className="w-4 h-4" />, style: 'bg-score-critical/5 border-score-critical/20 text-score-critical' },
            ].map((card, i) => (
              <motion.button
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveTab(card.key)}
                className={`border rounded-xl p-4 flex flex-col text-start transition-all ${card.style} ${activeTab === card.key ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-2 text-sm mb-1">
                  {card.icon}
                  {card.label}
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </motion.button>
            ))}
          </>
        )}
      </div>

      {/* Additional stats row */}
      {!isLoading && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">{branchGroups.length}</span> {isAr ? 'فرع' : 'branches'}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-score-weak" />
            <span className="font-medium text-foreground">{stats?.overdue || 0}</span> {isAr ? 'متأخر' : 'overdue'}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="w-4 h-4 text-score-critical" />
            <span className="font-medium text-foreground">{stats?.rejected || 0}</span> {isAr ? 'مرفوض' : 'rejected'}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="w-4 h-4 text-primary" />
            {isAr ? 'متوسط وقت الحل:' : 'Avg resolution:'} <span className="font-medium text-foreground">{stats?.avgResolutionDays || 0}</span> {isAr ? 'يوم' : 'days'}
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={expandAll}>
            {isAr ? 'توسيع الكل' : 'Expand All'}
          </Button>
        </div>
      )}

      {/* Findings List */}
      <div className="space-y-3">
        {findingsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : branchGroups.length > 0 ? (
          branchGroups.map((group) => {
            const isExpanded = expandedBranches.has(group.branchId);
            const openCount = group.findings.filter(f => f.status === 'open').length;
            const inProgressCount = group.findings.filter(f => f.status === 'in_progress').length;
            const rejectedCount = group.findings.filter(f => f.status === 'rejected').length;
            const pendingManagerCount = group.findings.filter(f => f.status === 'pending_manager_review').length;
            const overdueCount = group.findings.filter(f =>
              f.dueDate && new Date(f.dueDate) < new Date() && f.status !== 'resolved'
            ).length;
            const daysSince = differenceInDays(new Date(), new Date(group.earliestDate));

            return (
              <motion.div
                key={group.branchId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Branch Header */}
                <button
                  onClick={() => toggleBranch(group.branchId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div className="text-start">
                      <h3 className="font-semibold text-foreground">{group.branchName}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {group.findings.length} {isAr ? 'ملاحظة' : 'findings'}
                        </span>
                        {openCount > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-score-critical/10 text-score-critical">
                            {openCount} {isAr ? 'مفتوح' : 'open'}
                          </span>
                        )}
                        {pendingManagerCount > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-score-average/10 text-score-average">
                            {pendingManagerCount} {isAr ? 'بانتظار المدير' : 'pending manager'}
                          </span>
                        )}
                        {rejectedCount > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-score-critical/10 text-score-critical font-medium">
                            {rejectedCount} {isAr ? 'مرفوض' : 'rejected'}
                          </span>
                        )}
                        {overdueCount > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-score-weak/10 text-score-weak">
                            {overdueCount} {isAr ? 'متأخر' : 'overdue'}
                          </span>
                        )}
                        {daysSince > 30 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-score-critical/10 text-score-critical">
                            {daysSince} {isAr ? 'يوم' : 'days'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </button>

                {/* Findings List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border divide-y divide-border">
                        {group.findings.map(finding => {
                          const severity = getScoreSeverity(finding.score);
                          const statusInfo = getStatusInfo(finding.status);
                          const isOverdue = finding.dueDate && new Date(finding.dueDate) < new Date() && finding.status !== 'resolved';
                          
                          // Permission logic - NEW WORKFLOW
                          // Assign: BM + Admin only, for open/in_progress findings
                          const canAssign = (isAdmin || isBranchManager) && (finding.status === 'open' || finding.status === 'in_progress');
                          
                          // Resolve: 
                          // - BM can resolve directly (open/in_progress/rejected)
                          // - Employee can resolve their assigned findings (in_progress/rejected)
                          const canResolve = 
                            (isBranchManager && (finding.status === 'open' || finding.status === 'in_progress' || finding.status === 'rejected')) ||
                            (isBranchEmployee && finding.assignedTo === user?.id && (finding.status === 'in_progress' || finding.status === 'rejected'));
                          
                          // Manager review: BM reviews employee's resolution (pending_manager_review)
                          const showManagerReview = isBranchManager && finding.status === 'pending_manager_review';
                          
                          // Assessor review: assessor/admin reviews (pending_review)
                          const showAssessorReview = finding.status === 'pending_review' && canReviewFinding(finding);
                          
                          // View: for anyone who can't take action but can see
                          const showView = !canAssign && !canResolve && !showManagerReview && !showAssessorReview;

                          return (
                            <div key={finding.id} className={`p-4 hover:bg-muted/20 transition-colors ${finding.status === 'rejected' ? 'border-s-4 border-s-score-critical bg-score-critical/5' : ''}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 className="font-medium text-foreground">
                                      {isAr ? (finding.criterionNameAr || finding.criterionName) : finding.criterionName}
                                    </h4>
                                    <Badge variant="outline" className={`text-xs ${severity.color}`}>
                                      {finding.score}/{finding.maxScore} - {severity.label}
                                    </Badge>
                                    <Badge variant="outline" className={`text-xs ${statusInfo.color} flex items-center gap-1`}>
                                      {statusInfo.icon} {statusInfo.label}
                                    </Badge>
                                    {isOverdue && (
                                      <Badge variant="outline" className="text-xs bg-score-weak/10 text-score-weak border-score-weak/20">
                                        {isAr ? 'متأخر' : 'Overdue'}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {isAr ? (finding.categoryNameAr || finding.categoryName) : finding.categoryName}
                                  </p>

                                  {/* Assignment info */}
                                  {finding.assignedTo && (
                                    <div className="mt-1 mb-1 flex items-center gap-2 text-xs px-2 py-1 rounded bg-primary/5 border border-primary/10 w-fit">
                                      <UserPlus className="w-3 h-3 text-primary" />
                                      <span className="text-muted-foreground">{isAr ? 'معيّنة لـ:' : 'Assigned to:'}</span>
                                      <span className="font-medium text-foreground">{getUserName(finding.assignedTo)}</span>
                                      {finding.dueDate && (
                                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-score-critical font-medium' : 'text-muted-foreground'}`}>
                                          • <Calendar className="w-3 h-3" />
                                          {format(new Date(finding.dueDate), 'MMM d, yyyy')}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                    {!finding.assignedTo && (
                                      <span className="flex items-center gap-1">
                                        <UserPlus className="w-3 h-3" />
                                        {isAr ? 'غير معيّنة' : 'Unassigned'}
                                      </span>
                                    )}
                                    <span>
                                      {format(new Date(finding.createdAt), 'MMM d, yyyy')}
                                    </span>
                                  </div>

                                  {finding.assessorNotes && (
                                    <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
                                      "{finding.assessorNotes}"
                                    </p>
                                  )}

                                  {/* Show resolved by indicator */}
                                  {finding.resolvedBy && (finding.status === 'pending_manager_review' || finding.status === 'pending_review' || finding.status === 'resolved') && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                      <CheckCircle2 className="w-3 h-3 text-score-excellent" />
                                      <span>{isAr ? 'حُل بواسطة:' : 'Resolved by:'} <span className="font-medium text-foreground">{getUserName(finding.resolvedBy)}</span></span>
                                      {finding.resolvedAt && (
                                        <span>• {format(new Date(finding.resolvedAt), 'MMM d, yyyy')}</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Show resolution notes */}
                                  {finding.resolutionNotes && (finding.status === 'pending_manager_review' || finding.status === 'pending_review' || finding.status === 'resolved') && (
                                    <div className="mt-2 p-2 bg-score-excellent/5 border border-score-excellent/10 rounded text-xs">
                                      <span className="font-medium text-score-excellent">{isAr ? 'ملاحظات الإصلاح:' : 'Fix Notes:'}</span>{' '}
                                      {finding.resolutionNotes}
                                    </div>
                                  )}

                                  {/* Show rejection reason */}
                                  {finding.rejectionReason && finding.status === 'rejected' && (
                                    <div className="mt-2 p-2 bg-score-critical/5 border border-score-critical/10 rounded text-xs">
                                      <span className="font-medium text-score-critical">{isAr ? 'سبب الرفض:' : 'Rejection Reason:'}</span>{' '}
                                      {finding.rejectionReason}
                                    </div>
                                  )}

                                  {/* Reviewed by indicator - visible to admin, executive, support_agent */}
                                  {finding.reviewedBy && (finding.status === 'resolved' || finding.status === 'rejected') && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                      <Eye className="w-3 h-3" />
                                      <span>{isAr ? 'راجع بواسطة:' : 'Reviewed by:'} {getUserName(finding.reviewedBy)}</span>
                                      {finding.reviewedAt && (
                                        <span>• {format(new Date(finding.reviewedAt), 'MMM d, yyyy')}</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1 shrink-0">
                                  {canAssign && (
                                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAssign(finding)}>
                                      <UserPlus className="w-3 h-3 mr-1" />
                                      {finding.assignedTo
                                        ? (isAr ? 'إعادة تعيين' : 'Reassign')
                                        : (isAr ? 'تعيين' : 'Assign')}
                                    </Button>
                                  )}
                                  {canResolve && (
                                    <Button size="sm" variant="outline" className="text-xs h-7 border-score-excellent/30 text-score-excellent hover:bg-score-excellent/10" onClick={() => handleResolve(finding)}>
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      {isAr ? 'حل' : 'Resolve'}
                                    </Button>
                                  )}
                                  {showManagerReview && (
                                    <>
                                      <Button size="sm" variant="outline" className="text-xs h-7 border-score-excellent/30 text-score-excellent hover:bg-score-excellent/10" onClick={() => handleReview(finding, 'approve', true)}>
                                        <ThumbsUp className="w-3 h-3 mr-1" />
                                        {isAr ? 'موافقة' : 'Approve'}
                                      </Button>
                                      <Button size="sm" variant="outline" className="text-xs h-7 border-score-critical/30 text-score-critical hover:bg-score-critical/10" onClick={() => handleReview(finding, 'reject', true)}>
                                        <ThumbsDown className="w-3 h-3 mr-1" />
                                        {isAr ? 'رفض' : 'Reject'}
                                      </Button>
                                    </>
                                  )}
                                  {showAssessorReview && (
                                    <>
                                      <Button size="sm" variant="outline" className="text-xs h-7 border-score-excellent/30 text-score-excellent hover:bg-score-excellent/10" onClick={() => handleReview(finding, 'approve', false)}>
                                        <ThumbsUp className="w-3 h-3 mr-1" />
                                        {isAr ? 'اعتماد' : 'Approve'}
                                      </Button>
                                      <Button size="sm" variant="outline" className="text-xs h-7 border-score-critical/30 text-score-critical hover:bg-score-critical/10" onClick={() => handleReview(finding, 'reject', false)}>
                                        <ThumbsDown className="w-3 h-3 mr-1" />
                                        {isAr ? 'رفض' : 'Reject'}
                                      </Button>
                                    </>
                                  )}
                                  {showView && (
                                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                                      setViewFinding(finding);
                                      setViewDialogOpen(true);
                                    }}>
                                      <Eye className="w-3 h-3 mr-1" />
                                      {isAr ? 'عرض' : 'View'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">
              {isAr ? 'لا توجد ملاحظات' : 'No findings found'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? 'لا توجد ملاحظات حرجة تطابق الفلتر الحالي' : 'No critical findings match the current filter'}
            </p>
          </div>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAr ? 'تعيين الملاحظة' : 'Assign Finding'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFinding && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">{isAr ? (selectedFinding.criterionNameAr || selectedFinding.criterionName) : selectedFinding.criterionName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? 'الدرجة:' : 'Score:'} {selectedFinding.score}/{selectedFinding.maxScore}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{isAr ? 'تعيين إلى (موظفي الفرع)' : 'Assign To (Branch Employees)'}</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? 'اختر الموظف' : 'Select employee'} />
                </SelectTrigger>
                <SelectContent>
                  {selectedFinding && getBranchEmployees(selectedFinding.branchId).map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.roles.join(', ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={e => setAssignDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={submitAssignment}
              disabled={!assignUserId || !assignDueDate || assignMutation.isPending}
            >
              {assignMutation.isPending
                ? (isAr ? 'جاري التعيين...' : 'Assigning...')
                : (isAr ? 'تعيين' : 'Assign')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAr ? 'حل الملاحظة' : 'Resolve Finding'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFinding && (() => {
              const severity = getScoreSeverity(selectedFinding.score);
              const statusInfo = getStatusInfo(selectedFinding.status);
              return (
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {isAr ? (selectedFinding.criterionNameAr || selectedFinding.criterionName) : selectedFinding.criterionName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isAr ? (selectedFinding.categoryNameAr || selectedFinding.categoryName) : selectedFinding.categoryName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${severity.color}`}>
                      {selectedFinding.score}/{selectedFinding.maxScore} - {severity.label}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${statusInfo.color} flex items-center gap-1`}>
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'الفرع:' : 'Branch:'}</span>
                    <span className="font-medium text-foreground">
                      {isAr ? (selectedFinding.branchNameAr || selectedFinding.branchName) : selectedFinding.branchName}
                    </span>
                  </div>
                  {selectedFinding.assessorNotes && (
                    <div className="p-2 bg-background border border-border rounded text-xs space-y-1">
                      <span className="font-medium text-muted-foreground">{isAr ? 'ملاحظات المقيّم:' : 'Assessor Notes:'}</span>
                      <p className="text-foreground">{selectedFinding.assessorNotes}</p>
                    </div>
                  )}
                  {selectedFinding.attachments && selectedFinding.attachments.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">{isAr ? 'صور المقيّم:' : 'Assessor Photos:'}</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedFinding.attachments.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" className="w-14 h-14 rounded border border-border object-cover hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedFinding.status === 'rejected' && selectedFinding.rejectionReason && (
                    <div className="p-2 bg-score-critical/5 border border-score-critical/10 rounded text-xs space-y-1">
                      <span className="font-medium text-score-critical">{isAr ? 'سبب الرفض السابق:' : 'Previous Rejection:'}</span>
                      <p className="text-foreground">{selectedFinding.rejectionReason}</p>
                    </div>
                  )}
                  {findingHistory && findingHistory.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1">
                        <History className="w-3 h-3 text-primary" />
                        {isAr ? 'سجل المشكلة:' : 'History:'}
                      </span>
                      {findingHistory.map((entry) => {
                        const actionLabels: Record<string, string> = isAr
                          ? { assigned: 'تعيين', resolved: 'حل', approved: 'اعتماد', rejected: 'رفض', manager_approved: 'موافقة المدير', manager_rejected: 'رفض المدير' }
                          : { assigned: 'Assigned', resolved: 'Resolved', approved: 'Approved', rejected: 'Rejected', manager_approved: 'Manager Approved', manager_rejected: 'Manager Rejected' };
                        const actionColors: Record<string, string> = {
                          assigned: 'text-primary', resolved: 'text-score-average', approved: 'text-score-excellent', rejected: 'text-score-critical',
                          manager_approved: 'text-score-excellent', manager_rejected: 'text-score-critical',
                        };
                        return (
                          <div key={entry.id} className="text-[11px] flex items-start gap-2 ps-2 border-s-2 border-border">
                            <span className={`font-semibold shrink-0 ${actionColors[entry.action] || 'text-muted-foreground'}`}>
                              {actionLabels[entry.action] || entry.action}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {getUserName(entry.performedBy)} • {format(new Date(entry.createdAt), 'MMM d HH:mm')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>{isAr ? 'الإجراء المتخذ (إلزامي)' : 'Resolution / Action Taken (required)'}</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={isAr ? 'اكتب الإجراء الذي تم اتخاذه لحل هذه الملاحظة...' : 'Describe what action was taken to resolve this finding...'}
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
              />
              {resolveNotes.length === 0 && (
                <p className="text-xs text-score-critical">{isAr ? 'هذا الحقل إلزامي' : 'This field is required'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'إرفاق صورة (اختياري)' : 'Attach Photo (optional)'}</Label>
              <input ref={resolveFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleResolveImageAdd} />
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => resolveFileInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" />
                {isAr ? 'إضافة صورة' : 'Add Photo'}
              </Button>
              {resolveImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {resolveImagePreviews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeResolveImage(i)} className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info about where the resolution goes */}
            <div className="p-2 bg-primary/5 border border-primary/10 rounded text-xs text-muted-foreground">
              {isBranchManager && !isBranchEmployee
                ? (isAr ? '⬆️ سيتم إرسال الحل للمقيّم للمراجعة مباشرة' : '⬆️ Resolution will be sent directly to assessor for review')
                : (isAr ? '⬆️ سيتم إرسال الحل لمدير الفرع للموافقة أولاً' : '⬆️ Resolution will be sent to branch manager for approval first')
              }
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={submitResolve}
              disabled={!resolveNotes.trim() || resolveMutation.isPending || isUploading}
            >
              {resolveMutation.isPending
                ? (isAr ? 'جاري الإرسال...' : 'Submitting...')
                : (isAr ? 'إرسال الحل' : 'Submit Fix')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog (for both manager and assessor review) */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isManagerReview
                ? (reviewAction === 'approve'
                  ? (isAr ? 'الموافقة على الإصلاح' : 'Approve Fix')
                  : (isAr ? 'رفض الإصلاح' : 'Reject Fix'))
                : (reviewAction === 'approve'
                  ? (isAr ? 'اعتماد الإصلاح' : 'Approve Fix')
                  : (isAr ? 'رفض الإصلاح' : 'Reject Fix'))
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFinding && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                <p className="font-medium">{isAr ? (selectedFinding.criterionNameAr || selectedFinding.criterionName) : selectedFinding.criterionName}</p>
                <p className="text-xs text-muted-foreground">
                  {isAr ? 'الدرجة:' : 'Score:'} {selectedFinding.score}/{selectedFinding.maxScore}
                </p>
                {selectedFinding.resolutionNotes && (
                  <div className="p-2 bg-score-excellent/5 border border-score-excellent/10 rounded text-xs">
                    <span className="font-medium text-score-excellent">{isAr ? 'ملاحظات الإصلاح:' : 'Fix Notes:'}</span>{' '}
                    {selectedFinding.resolutionNotes}
                  </div>
                )}
                {selectedFinding.resolutionAttachments && selectedFinding.resolutionAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedFinding.resolutionAttachments.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-12 h-12 rounded border border-border object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {isManagerReview && (
                  <div className="p-2 bg-primary/5 border border-primary/10 rounded text-xs text-muted-foreground">
                    {reviewAction === 'approve'
                      ? (isAr ? 'عند الموافقة، سيتم إرسال الإصلاح للمقيّم للمراجعة النهائية' : 'Upon approval, the fix will be sent to the assessor for final review')
                      : (isAr ? 'عند الرفض، سيتم إرجاع الملاحظة للموظف مع سبب الرفض' : 'Upon rejection, the finding will be returned to the employee with the reason')
                    }
                  </div>
                )}
              </div>
            )}

            {reviewAction === 'reject' && (
              <div className="space-y-2">
                <Label>{isAr ? 'سبب الرفض (إلزامي)' : 'Rejection Reason (required)'}</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder={isAr ? 'اكتب سبب رفض الإصلاح...' : 'Explain why this fix is being rejected...'}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
                {rejectionReason.length === 0 && (
                  <p className="text-xs text-score-critical">{isAr ? 'هذا الحقل إلزامي' : 'This field is required'}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>{isAr ? 'إرفاق صورة (اختياري)' : 'Attach Photo (optional)'}</Label>
              <input ref={reviewFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleReviewImageAdd} />
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => reviewFileInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" />
                {isAr ? 'إضافة صورة' : 'Add Photo'}
              </Button>
              {reviewImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {reviewImagePreviews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeReviewImage(i)} className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={submitReview}
              disabled={
                (reviewAction === 'reject' && !rejectionReason.trim()) ||
                approveMutation.isPending || rejectMutation.isPending || 
                managerApproveMutation.isPending || managerRejectMutation.isPending || isUploading
              }
              className={reviewAction === 'approve' ? 'bg-score-excellent hover:bg-score-excellent/90' : 'bg-score-critical hover:bg-score-critical/90'}
            >
              {(approveMutation.isPending || rejectMutation.isPending || managerApproveMutation.isPending || managerRejectMutation.isPending)
                ? (isAr ? 'جاري المعالجة...' : 'Processing...')
                : reviewAction === 'approve'
                  ? (isAr ? (isManagerReview ? 'موافقة' : 'اعتماد') : 'Approve')
                  : (isAr ? 'رفض' : 'Reject')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAr ? 'تفاصيل الملاحظة' : 'Finding Details'}
            </DialogTitle>
          </DialogHeader>
          {viewFinding && (() => {
            const severity = getScoreSeverity(viewFinding.score);
            const statusInfo = getStatusInfo(viewFinding.status);
            return (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    {isAr ? (viewFinding.criterionNameAr || viewFinding.criterionName) : viewFinding.criterionName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isAr ? (viewFinding.categoryNameAr || viewFinding.categoryName) : viewFinding.categoryName}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${severity.color}`}>
                      {viewFinding.score}/{viewFinding.maxScore} - {severity.label}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${statusInfo.color} flex items-center gap-1`}>
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{isAr ? 'الفرع:' : 'Branch:'}</span>
                  <span className="font-medium">{isAr ? (viewFinding.branchNameAr || viewFinding.branchName) : viewFinding.branchName}</span>
                </div>

                {viewFinding.assignedTo && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{isAr ? 'معيّن إلى:' : 'Assigned to:'}</span>
                    <span className="font-medium">{getUserName(viewFinding.assignedTo)}</span>
                  </div>
                )}

                {viewFinding.dueDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{isAr ? 'تاريخ الاستحقاق:' : 'Due date:'}</span>
                    <span className="font-medium">{format(new Date(viewFinding.dueDate), 'MMM d, yyyy')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{isAr ? 'تاريخ الإنشاء:' : 'Created:'}</span>
                  <span className="font-medium">{format(new Date(viewFinding.createdAt), 'MMM d, yyyy')}</span>
                </div>

                {viewFinding.assessorNotes && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                    <span className="font-medium text-muted-foreground">{isAr ? 'ملاحظات المقيّم:' : 'Assessor Notes:'}</span>
                    <p className="text-foreground">{viewFinding.assessorNotes}</p>
                  </div>
                )}

                {viewFinding.attachments && viewFinding.attachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">{isAr ? 'صور الملاحظة:' : 'Finding Photos:'}</span>
                    <div className="flex flex-wrap gap-2">
                      {viewFinding.attachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="w-20 h-20 rounded-lg border border-border object-cover hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {viewFinding.resolvedBy && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-score-excellent" />
                    <span className="text-muted-foreground">{isAr ? 'حُل بواسطة:' : 'Resolved by:'}</span>
                    <span className="font-medium">{getUserName(viewFinding.resolvedBy)}</span>
                    {viewFinding.resolvedAt && (
                      <span className="text-muted-foreground">• {format(new Date(viewFinding.resolvedAt), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                )}

                {viewFinding.resolutionNotes && (
                  <div className="p-3 bg-score-excellent/5 border border-score-excellent/10 rounded-lg text-sm space-y-1">
                    <span className="font-medium text-score-excellent">{isAr ? 'ملاحظات الإصلاح:' : 'Fix Notes:'}</span>
                    <p className="text-foreground">{viewFinding.resolutionNotes}</p>
                  </div>
                )}

                {viewFinding.resolutionAttachments && viewFinding.resolutionAttachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-score-excellent">{isAr ? 'صور الإصلاح:' : 'Fix Photos:'}</span>
                    <div className="flex flex-wrap gap-2">
                      {viewFinding.resolutionAttachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="w-20 h-20 rounded-lg border border-border object-cover hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {viewFinding.rejectionReason && (
                  <div className="p-3 bg-score-critical/5 border border-score-critical/10 rounded-lg text-sm space-y-1">
                    <span className="font-medium text-score-critical">{isAr ? 'سبب الرفض:' : 'Rejection Reason:'}</span>
                    <p className="text-foreground">{viewFinding.rejectionReason}</p>
                  </div>
                )}

                {viewFinding.reviewAttachments && viewFinding.reviewAttachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">{isAr ? 'صور المراجعة:' : 'Review Photos:'}</span>
                    <div className="flex flex-wrap gap-2">
                      {viewFinding.reviewAttachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="w-20 h-20 rounded-lg border border-border object-cover hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {viewFinding.reviewedBy && (
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{isAr ? 'راجع بواسطة:' : 'Reviewed by:'}</span>
                    <span className="font-medium">{getUserName(viewFinding.reviewedBy)}</span>
                    {viewFinding.reviewedAt && (
                      <span className="text-muted-foreground">• {format(new Date(viewFinding.reviewedAt), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                )}

                {/* History Timeline */}
                {findingHistory && findingHistory.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <History className="w-4 h-4 text-primary" />
                      {isAr ? 'مسار المشكلة' : 'Finding Timeline'}
                    </div>
                    <div className="relative ps-4 space-y-3">
                      <div className="absolute start-[7px] top-2 bottom-2 w-px bg-border" />
                      {findingHistory.map((entry) => {
                        const actionConfig: Record<string, { label: string; labelAr: string; color: string; icon: React.ReactNode }> = {
                          assigned: { label: 'Assigned', labelAr: 'تم التعيين', color: 'text-primary', icon: <UserPlus className="w-3 h-3" /> },
                          resolved: { label: 'Resolved', labelAr: 'تم الحل', color: 'text-score-excellent', icon: <CheckCircle2 className="w-3 h-3" /> },
                          approved: { label: 'Approved', labelAr: 'تم الاعتماد', color: 'text-score-excellent', icon: <ThumbsUp className="w-3 h-3" /> },
                          rejected: { label: 'Rejected', labelAr: 'تم الرفض', color: 'text-score-critical', icon: <XCircle className="w-3 h-3" /> },
                          manager_approved: { label: 'Manager Approved', labelAr: 'موافقة المدير', color: 'text-score-excellent', icon: <ShieldCheck className="w-3 h-3" /> },
                          manager_rejected: { label: 'Manager Rejected', labelAr: 'رفض المدير', color: 'text-score-critical', icon: <XCircle className="w-3 h-3" /> },
                        };
                        const config = actionConfig[entry.action] || { label: entry.action, labelAr: entry.action, color: 'text-muted-foreground', icon: <Clock className="w-3 h-3" /> };
                        return (
                          <div key={entry.id} className="relative">
                            <div className={`absolute start-[-13px] top-1 w-3 h-3 rounded-full border-2 border-background ${
                              entry.action === 'rejected' || entry.action === 'manager_rejected' ? 'bg-score-critical' : 
                              entry.action === 'approved' || entry.action === 'manager_approved' ? 'bg-score-excellent' : 
                              entry.action === 'resolved' ? 'bg-score-average' : 'bg-primary'
                            }`} />
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold ${config.color} flex items-center gap-1`}>
                                  {config.icon} {isAr ? config.labelAr : config.label}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="font-medium text-foreground">{getUserName(entry.performedBy)}</span>
                                <span className="text-muted-foreground">{format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}</span>
                              </div>
                              {entry.notes && (
                                <p className="text-muted-foreground ps-1">{entry.notes}</p>
                              )}
                              {entry.attachments && entry.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1 ps-1">
                                  {entry.attachments.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                      <img src={url} alt="" className="w-12 h-12 rounded border border-border object-cover hover:opacity-80" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {historyLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
