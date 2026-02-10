import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, Clock, CheckCircle2, Target,
  UserPlus, Calendar, TrendingUp, Building2, ChevronDown,
  ChevronRight, AlertCircle, Timer, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCriticalFindings, useFindingStats, useAssignFinding, useResolveFinding, Finding } from '@/hooks/useFindings';
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

  const statusFilter = activeTab !== 'all' ? activeTab : undefined;
  const { data: findings, isLoading: findingsLoading } = useCriticalFindings(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: stats, isLoading: statsLoading } = useFindingStats();
  const { data: users } = useUsers();
  const assignMutation = useAssignFinding();
  const resolveMutation = useResolveFinding();

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
    setResolveDialogOpen(true);
  };

  const submitResolve = async () => {
    if (!selectedFinding || !resolveNotes.trim()) return;
    try {
      await resolveMutation.mutateAsync({
        findingId: selectedFinding.id,
        assignedTo: selectedFinding.assignedTo,
        resolution: resolveNotes.trim(),
      });
      toast.success(isAr ? 'تم حل الملاحظة بنجاح' : 'Finding resolved successfully');
      setResolveDialogOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to resolve finding');
    }
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
      case 'resolved': return {
        label: isAr ? 'تم الحل' : 'Resolved',
        color: 'bg-score-excellent/10 text-score-excellent border-score-excellent/20',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
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
            {isAr ? 'الملاحظات ذات الدرجات من 0 إلى 3 - تتطلب متابعة' : 'Findings scoring 0-3 — requires follow-up & resolution'}
          </p>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-score-excellent/5 border border-score-excellent/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 text-sm text-score-excellent mb-1">
                <TrendingUp className="w-4 h-4" />
                {isAr ? 'نسبة الحل' : 'Resolution Rate'}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.resolutionRate || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.resolved || 0} {isAr ? 'تم حلها' : 'resolved'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
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
              <TabsTrigger value="resolved" className="whitespace-nowrap text-xs sm:text-sm px-3">
                {isAr ? 'تم الحل' : 'Resolved'} ({stats?.resolved || 0})
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
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-col gap-1.5 shrink-0">
                                    {finding.status !== 'resolved' && (
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
                                          {isAr ? 'حل' : 'Resolve'}
                                        </Button>
                                      </>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={submitResolve}
              disabled={!resolveNotes.trim() || resolveMutation.isPending}
            >
              {resolveMutation.isPending
                ? (isAr ? 'جاري الحل...' : 'Resolving...')
                : (isAr ? 'حل' : 'Resolve')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
