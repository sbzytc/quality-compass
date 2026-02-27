import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, Clock, CheckCircle2, Target,
  UserPlus, Calendar, TrendingUp, Building2, ChevronDown,
  ChevronRight, AlertCircle, Timer, BarChart3, Camera, X, Eye, XCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCriticalFindings, useFindingStats, useAssignFinding, useResolveFinding, useApproveFinding, useRejectFinding, Finding } from '@/hooks/useFindings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from '@/hooks/useUsers';
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

  const { user, roles } = useAuth();
  const statusFilter = activeTab !== 'all' ? activeTab : undefined;
  const { data: findings, isLoading: findingsLoading } = useCriticalFindings(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: stats, isLoading: statsLoading } = useFindingStats();
  const { data: users } = useUsers();
  const assignMutation = useAssignFinding();
  const resolveMutation = useResolveFinding();
  const approveMutation = useApproveFinding();
  const rejectMutation = useRejectFinding();

  const isLoading = findingsLoading || statsLoading;

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
      // Track the earliest evaluation date for this branch's findings
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

  const handleAssign = (finding: Finding) => {
    setSelectedFinding(finding);
    setAssignUserId(finding.assignedTo || '');
    setAssignDueDate(finding.dueDate || '');
    setAssignDialogOpen(true);
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
      // Upload images if any
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

      await resolveMutation.mutateAsync({
        findingId: selectedFinding.id,
        assessorId: selectedFinding.assessorId,
        resolution: resolveNotes.trim(),
        attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
      toast.success(isAr ? 'تم إرسال الإصلاح للمراجعة' : 'Fix submitted for review');
      setResolveDialogOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to resolve finding');
    } finally {
      setIsUploading(false);
    }
  };

  // Review handlers
  const handleReview = (finding: Finding, action: 'approve' | 'reject') => {
    setSelectedFinding(finding);
    setReviewAction(action);
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

      if (reviewAction === 'approve') {
        await approveMutation.mutateAsync({
          findingId: selectedFinding.id,
          attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        });
        toast.success(isAr ? 'تم اعتماد الإصلاح' : 'Fix approved successfully');
      } else {
        await rejectMutation.mutateAsync({
          findingId: selectedFinding.id,
          reason: rejectionReason.trim(),
          attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          assignedTo: selectedFinding.assignedTo,
        });
        toast.success(isAr ? 'تم رفض الإصلاح' : 'Fix rejected');
      }
      setReviewDialogOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to submit review');
    } finally {
      setIsUploading(false);
    }
  };

  const isAdmin = roles.includes('admin');

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
      case 'pending_review': return {
        label: isAr ? 'بانتظار المراجعة' : 'Pending Review',
        color: 'bg-score-average/10 text-score-average border-score-average/20',
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
    const user = users.find(u => u.user_id === userId);
    return user?.full_name || userId;
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

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Target className="w-4 h-4" />
                {isAr ? 'الإجمالي' : 'Total'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'ملاحظة حرجة' : 'critical findings'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-score-critical/5 border border-score-critical/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-score-critical mb-1">
                <AlertTriangle className="w-4 h-4" />
                {isAr ? 'مفتوح' : 'Open'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.open || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'غير معيّن' : 'unassigned'}: {stats?.unassigned || 0}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-primary mb-1">
                <Timer className="w-4 h-4" />
                {isAr ? 'جاري حلها' : 'In Progress'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.inProgress || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'قيد المعالجة' : 'being worked on'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-score-weak/5 border border-score-weak/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-score-weak mb-1">
                <Clock className="w-4 h-4" />
                {isAr ? 'متأخر' : 'Overdue'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.overdue || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'تجاوز الموعد' : 'past due date'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-score-excellent/5 border border-score-excellent/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-score-excellent mb-1">
                <CheckCircle2 className="w-4 h-4" />
                {isAr ? 'تم الحل' : 'Resolved'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.resolved || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'ملاحظة محلولة' : 'issues resolved'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-score-excellent/5 border border-score-excellent/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-score-excellent mb-1">
                <TrendingUp className="w-4 h-4" />
                {isAr ? 'نسبة الحل' : 'Resolution Rate'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.resolutionRate || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.resolved || 0} {isAr ? 'من' : 'of'} {stats?.total || 0} {isAr ? 'تم حلها' : 'resolved'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-primary mb-1">
                <BarChart3 className="w-4 h-4" />
                {isAr ? 'متوسط وقت الحل' : 'Avg Resolution'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.avgResolutionDays || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'يوم' : 'days'}
              </p>
            </motion.div>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex min-w-max">
              <TabsTrigger value="all" className="whitespace-nowrap text-xs sm:text-sm px-3">
                {isAr ? 'الكل' : 'All'} ({stats?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="open" className="whitespace-nowrap text-xs sm:text-sm px-3">
                {isAr ? 'مفتوح' : 'Open'} ({stats?.open || 0})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="whitespace-nowrap text-xs sm:text-sm px-3">
                {isAr ? 'قيد المعالجة' : 'In Progress'} ({stats?.inProgress || 0})
              </TabsTrigger>
              <TabsTrigger value="pending_review" className="whitespace-nowrap text-xs sm:text-sm px-3">
                {isAr ? 'بانتظار المراجعة' : 'Pending Review'} ({stats?.pendingReview || 0})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="whitespace-nowrap text-xs sm:text-sm px-3">
                {isAr ? 'مرفوض' : 'Rejected'} ({stats?.rejected || 0})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="whitespace-nowrap text-xs sm:text-sm px-3">
                {isAr ? 'تم الاعتماد' : 'Approved'} ({stats?.resolved || 0})
              </TabsTrigger>
            </TabsList>
          </div>
          <Button variant="outline" size="sm" onClick={expandAll}>
            {isAr ? 'توسيع الكل' : 'Expand All'}
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-0 space-y-3">
          {findingsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : branchGroups.length > 0 ? (
            branchGroups.map((group) => {
              const isExpanded = expandedBranches.has(group.branchId);
              const openCount = group.findings.filter(f => f.status === 'open').length;
              const inProgressCount = group.findings.filter(f => f.status === 'in_progress').length;
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
                      <Building2 className="w-5 h-5 text-primary" />
                      <div className={`text-${direction === 'rtl' ? 'right' : 'left'}`}>
                        <h3 className="font-semibold text-foreground">{group.branchName}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{group.findings.length} {isAr ? 'ملاحظة' : 'findings'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(group.earliestDate), 'MMM d, yyyy')}
                          </span>
                          <span>•</span>
                          <span className={`font-medium ${daysSince > 30 ? 'text-score-critical' : daysSince > 14 ? 'text-score-weak' : 'text-muted-foreground'}`}>
                            {daysSince} {isAr ? 'يوم' : daysSince === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {overdueCount > 0 && (
                        <Badge variant="outline" className="bg-score-critical/10 text-score-critical border-score-critical/20 text-xs">
                          {overdueCount} {isAr ? 'متأخر' : 'overdue'}
                        </Badge>
                      )}
                      {openCount > 0 && (
                        <Badge variant="outline" className="bg-score-weak/10 text-score-weak border-score-weak/20 text-xs">
                          {openCount} {isAr ? 'مفتوح' : 'open'}
                        </Badge>
                      )}
                      {inProgressCount > 0 && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                          {inProgressCount} {isAr ? 'قيد المعالجة' : 'in progress'}
                        </Badge>
                      )}
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                    </div>
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
                        <div className="divide-y divide-border border-t border-border">
                          {group.findings.map((finding) => {
                            const severity = getScoreSeverity(finding.score);
                            const statusInfo = getStatusInfo(finding.status);
                            const isOverdue = finding.dueDate && new Date(finding.dueDate) < new Date() && finding.status !== 'resolved';

                            return (
                              <div key={finding.id} className="p-4 hover:bg-muted/20 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                      <h4 className="font-medium text-foreground text-sm">
                                        {isAr ? (finding.criterionNameAr || finding.criterionName) : finding.criterionName}
                                      </h4>
                                      <Badge variant="outline" className={`text-xs ${severity.color}`}>
                                        {finding.score}/{finding.maxScore} — {severity.label}
                                      </Badge>
                                      <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                                        <span className="flex items-center gap-1">
                                          {statusInfo.icon}
                                          {statusInfo.label}
                                        </span>
                                      </Badge>
                                      {isOverdue && (
                                        <Badge variant="outline" className="text-xs bg-score-critical/10 text-score-critical border-score-critical/20">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          {isAr ? 'متأخر' : 'Overdue'}
                                        </Badge>
                                      )}
                                    </div>

                                    <p className="text-xs text-muted-foreground mb-2">
                                      {isAr ? (finding.categoryNameAr || finding.categoryName) : finding.categoryName}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <UserPlus className="w-3 h-3" />
                                        {getUserName(finding.assignedTo)}
                                      </span>
                                      {finding.dueDate && (
                                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-score-critical font-medium' : ''}`}>
                                          <Calendar className="w-3 h-3" />
                                          {format(new Date(finding.dueDate), 'MMM d, yyyy')}
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

                                    {/* Show resolution notes for pending_review/rejected */}
                                    {finding.resolutionNotes && (finding.status === 'pending_review' || finding.status === 'resolved') && (
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

                                    {/* Show reviewer indicator for resolved/rejected findings */}
                                    {finding.reviewedBy && ['resolved', 'rejected'].includes(finding.status) && (
                                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>
                                          {isAr ? 'تمت المراجعة بواسطة' : 'Reviewed by'}{' '}
                                          <span className="font-medium text-foreground">{getUserName(finding.reviewedBy)}</span>
                                          {finding.reviewedBy !== finding.assessorId && (
                                            <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                                              {isAr ? 'مشرف' : 'Admin'}
                                            </Badge>
                                          )}
                                        </span>
                                        {finding.reviewedAt && (
                                          <span className="text-muted-foreground">
                                            · {format(new Date(finding.reviewedAt), 'MMM d, yyyy')}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Show resolution attachments */}
                                    {finding.resolutionAttachments && finding.resolutionAttachments.length > 0 && (finding.status === 'pending_review' || finding.status === 'resolved') && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {finding.resolutionAttachments.map((url, i) => (
                                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt="" className="w-10 h-10 rounded border border-border object-cover" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-col gap-1.5 shrink-0">
                                    {/* Open/In Progress/Rejected: show assign + resolve */}
                                    {['open', 'in_progress', 'rejected'].includes(finding.status) && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-7"
                                          onClick={() => handleAssign(finding)}
                                        >
                                          <UserPlus className="w-3 h-3 mr-1" />
                                          {isAr ? 'تعيين' : 'Assign'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="text-xs h-7"
                                          onClick={() => handleResolve(finding)}
                                        >
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          {finding.status === 'rejected' ? (isAr ? 'إعادة الإصلاح' : 'Re-fix') : (isAr ? 'حل' : 'Resolve')}
                                        </Button>
                                      </>
                                    )}

                                    {/* Pending Review: show approve/reject only for the assessor */}
                                    {finding.status === 'pending_review' && canReviewFinding(finding) && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="text-xs h-7 bg-score-excellent hover:bg-score-excellent/90"
                                          onClick={() => handleReview(finding, 'approve')}
                                        >
                                          <ThumbsUp className="w-3 h-3 mr-1" />
                                          {isAr ? 'اعتماد' : 'Approve'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-7 border-score-critical/30 text-score-critical hover:bg-score-critical/10"
                                          onClick={() => handleReview(finding, 'reject')}
                                        >
                                          <ThumbsDown className="w-3 h-3 mr-1" />
                                          {isAr ? 'رفض' : 'Reject'}
                                        </Button>
                                      </>
                                    )}

                                    {finding.status === 'pending_review' && !canReviewFinding(finding) && (
                                      <Badge variant="outline" className="text-xs bg-score-average/10 text-score-average">
                                        <Eye className="w-3 h-3 mr-1" />
                                        {isAr ? 'بانتظار المراجعة' : 'Awaiting Review'}
                                      </Badge>
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
            <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isAr ? 'لا توجد ملاحظات حرجة' : 'No critical findings'}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
              <Label>{isAr ? 'تعيين إلى' : 'Assign To'}</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? 'اختر المسؤول' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  {users?.filter(u => u.is_active).map(u => (
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
            {selectedFinding && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">{isAr ? (selectedFinding.criterionNameAr || selectedFinding.criterionName) : selectedFinding.criterionName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? 'الدرجة:' : 'Score:'} {selectedFinding.score}/{selectedFinding.maxScore}
                </p>
              </div>
            )}
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

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>{isAr ? 'إرفاق صورة (اختياري)' : 'Attach Photo (optional)'}</Label>
              <input
                ref={resolveFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleResolveImageAdd}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => resolveFileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isAr ? 'إضافة صورة' : 'Add Photo'}
              </Button>
              {resolveImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {resolveImagePreviews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeResolveImage(i)}
                        className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                ? (isAr ? 'جاري الحل...' : 'Resolving...')
                : (isAr ? 'حل' : 'Resolve')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve'
                ? (isAr ? 'اعتماد الإصلاح' : 'Approve Fix')
                : (isAr ? 'رفض الإصلاح' : 'Reject Fix')
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

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>{isAr ? 'إرفاق صورة (اختياري)' : 'Attach Photo (optional)'}</Label>
              <input
                ref={reviewFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleReviewImageAdd}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => reviewFileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isAr ? 'إضافة صورة' : 'Add Photo'}
              </Button>
              {reviewImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {reviewImagePreviews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeReviewImage(i)}
                        className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                      >
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
                approveMutation.isPending || rejectMutation.isPending || isUploading
              }
              className={reviewAction === 'approve' ? 'bg-score-excellent hover:bg-score-excellent/90' : 'bg-score-critical hover:bg-score-critical/90'}
            >
              {(approveMutation.isPending || rejectMutation.isPending)
                ? (isAr ? 'جاري المعالجة...' : 'Processing...')
                : reviewAction === 'approve'
                  ? (isAr ? 'اعتماد' : 'Approve')
                  : (isAr ? 'رفض' : 'Reject')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
