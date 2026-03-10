import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Eye, Calendar, User, Building2, AlertCircle, CheckCircle2, Clock, UserPlus, Download, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerComplaints, useUpdateComplaint, CustomerComplaint } from '@/hooks/useCustomerFeedback';
import { useBranches } from '@/hooks/useBranches';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportExcel';

export default function CustomerComplaintsPage() {
  const { direction, language } = useLanguage();
  const isAr = language === 'ar';
  const { user, profile, roles } = useAuth();
  const isBranchManager = roles.includes('branch_manager');
  const isAdmin = roles.includes('admin');

  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const canViewComplaints = isAdmin || profile?.can_view_complaints;
  const canViewSuggestions = isAdmin || profile?.can_view_suggestions;

  // If user has neither permission, show no access
  if (!canViewComplaints && !canViewSuggestions) {
    return (
      <div className="p-6 text-center" dir={direction}>
        <p className="text-muted-foreground">{isAr ? 'ليس لديك صلاحية الوصول لهذه الصفحة' : 'You do not have access to this page'}</p>
      </div>
    );
  }

  // Default to the first available tab
  const defaultType = canViewComplaints ? 'complaints' : 'suggestions';
  const [activeType, setActiveType] = useState<string>(defaultType);
  const [viewComplaint, setViewComplaint] = useState<CustomerComplaint | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  const branchFilter = selectedBranch !== 'all' ? selectedBranch :
    (isBranchManager && !isAdmin ? profile?.branch_id || undefined : undefined);

  const { data: complaints, isLoading } = useCustomerComplaints(branchFilter || undefined);
  const { data: branches } = useBranches();
  const { data: users } = useUsers();
  const updateMutation = useUpdateComplaint();

  const showBranchFilter = isAdmin || roles.includes('executive');

  const complaintsOnly = complaints?.filter(c => c.type === 'complaint') || [];
  const suggestionsOnly = complaints?.filter(c => c.type === 'suggestion') || [];

  const currentList = activeType === 'complaints' ? complaintsOnly : suggestionsOnly;
  const filteredList = currentList.filter(c =>
    activeStatus === 'all' || c.status === activeStatus
  );

  const statusTabs = [
    { key: 'all', label: isAr ? 'الكل' : 'All', count: currentList.length },
    { key: 'new', label: isAr ? 'جديدة' : 'New', count: currentList.filter(c => c.status === 'new').length },
    { key: 'in_progress', label: isAr ? 'قيد المعالجة' : 'In Progress', count: currentList.filter(c => c.status === 'in_progress').length },
    { key: 'resolved', label: isAr ? 'تم الحل' : 'Resolved', count: currentList.filter(c => c.status === 'resolved').length },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      new: { label: isAr ? 'جديدة' : 'New', variant: 'destructive' },
      in_progress: { label: isAr ? 'قيد المعالجة' : 'In Progress', variant: 'default' },
      resolved: { label: isAr ? 'تم الحل' : 'Resolved', variant: 'secondary' },
    };
    const info = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const handleAssign = async () => {
    if (!viewComplaint || !assignUserId) return;
    try {
      await updateMutation.mutateAsync({
        id: viewComplaint.id,
        assigned_to: assignUserId,
        status: 'in_progress',
      });
      toast.success(isAr ? 'تم التعيين بنجاح' : 'Assigned successfully');
      setAssignOpen(false);
      setViewOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'An error occurred');
    }
  };

  const handleResolve = async () => {
    if (!viewComplaint) return;
    try {
      await updateMutation.mutateAsync({
        id: viewComplaint.id,
        status: 'resolved',
        resolution_notes: resolveNotes,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      });
      toast.success(isAr ? 'تم الحل بنجاح' : 'Resolved successfully');
      setResolveOpen(false);
      setViewOpen(false);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'An error occurred');
    }
  };

  const handleExport = () => {
    const data = filteredList;
    if (!data.length) {
      toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    const typeLabel = activeType === 'complaints' ? (isAr ? 'شكاوى' : 'Complaints') : (isAr ? 'اقتراحات' : 'Suggestions');
    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'العميل' : 'Customer',
      isAr ? 'الجوال' : 'Phone',
      isAr ? 'الفرع' : 'Branch',
      isAr ? 'النص' : 'Text',
      isAr ? 'الحالة' : 'Status',
      isAr ? 'ملاحظات الحل' : 'Resolution Notes',
    ];
    const rows = data.map(c => [
      format(new Date(c.created_at), 'dd/MM/yyyy HH:mm'),
      c.feedback?.customer_name || '',
      c.feedback?.customer_phone || '',
      isAr ? (c.branch?.name_ar || c.branch?.name || '') : (c.branch?.name || ''),
      c.complaint_text,
      c.status,
      c.resolution_notes || '',
    ]);
    exportToExcel(headers, rows, `${typeLabel}-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success(isAr ? 'تم التصدير بنجاح' : 'Exported successfully');
  };

  const branchEmployees = users?.filter(u => {
    if (!viewComplaint) return false;
    return u.branch_id === viewComplaint.branch_id;
  });

  const renderList = (items: CustomerComplaint[]) => {
    if (!items.length) {
      return (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {activeType === 'complaints'
              ? (isAr ? 'لا توجد شكاوى' : 'No complaints')
              : (isAr ? 'لا توجد اقتراحات' : 'No suggestions')}
          </p>
        </Card>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((complaint, i) => (
          <motion.div
            key={complaint.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setViewComplaint(complaint); setViewOpen(true); }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(complaint.status)}
                    <Badge variant="outline" className={`text-xs ${complaint.type === 'complaint' ? 'border-destructive/50 text-destructive' : 'border-emerald-500/50 text-emerald-600'}`}>
                      {complaint.type === 'complaint' ? (isAr ? 'شكوى' : 'Complaint') : (isAr ? 'اقتراح' : 'Suggestion')}
                    </Badge>
                    {complaint.branch && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="w-3 h-3 me-1" />
                        {isAr ? (complaint.branch.name_ar || complaint.branch.name) : complaint.branch.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm line-clamp-2">{complaint.complaint_text}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {complaint.feedback?.customer_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(complaint.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? 'شكاوى واقتراحات العملاء' : 'Customer Complaints & Suggestions'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr ? 'إدارة ومتابعة شكاوى واقتراحات العملاء' : 'Manage and track customer complaints and suggestions'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 me-1" />
            {isAr ? 'تصدير Excel' : 'Export Excel'}
          </Button>
          {showBranchFilter && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isAr ? 'جميع الفروع' : 'All Branches'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'جميع الفروع' : 'All Branches'}</SelectItem>
                {branches?.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {isAr ? (b.nameAr || b.name) : b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{complaintsOnly.filter(c => c.status === 'new').length}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'شكاوى جديدة' : 'New Complaints'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{suggestionsOnly.filter(c => c.status === 'new').length}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'اقتراحات جديدة' : 'New Suggestions'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{complaints?.filter(c => c.status === 'in_progress').length || 0}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'قيد المعالجة' : 'In Progress'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--score-excellent))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[hsl(var(--score-excellent))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{complaints?.filter(c => c.status === 'resolved').length || 0}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'تم حلها' : 'Resolved'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Complaints vs Suggestions */}
      <Tabs value={activeType} onValueChange={(v) => { setActiveType(v); setActiveStatus('all'); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="complaints" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            {isAr ? 'الشكاوى' : 'Complaints'}
            <Badge variant="secondary" className="text-xs">{complaintsOnly.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            {isAr ? 'الاقتراحات' : 'Suggestions'}
            <Badge variant="secondary" className="text-xs">{suggestionsOnly.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap mt-4">
          {statusTabs.map(tab => (
            <Button
              key={tab.key}
              variant={activeStatus === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveStatus(tab.key)}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ms-2 text-xs">{tab.count}</Badge>
              )}
            </Button>
          ))}
        </div>

        <TabsContent value="complaints" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : renderList(filteredList)}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : renderList(filteredList)}
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewComplaint?.type === 'suggestion'
                ? (isAr ? 'تفاصيل الاقتراح' : 'Suggestion Details')
                : (isAr ? 'تفاصيل الشكوى' : 'Complaint Details')}
            </DialogTitle>
          </DialogHeader>
          {viewComplaint && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(viewComplaint.status)}
                <Badge variant="outline" className={viewComplaint.type === 'complaint' ? 'border-destructive/50 text-destructive' : 'border-emerald-500/50 text-emerald-600'}>
                  {viewComplaint.type === 'complaint' ? (isAr ? 'شكوى' : 'Complaint') : (isAr ? 'اقتراح' : 'Suggestion')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'العميل' : 'Customer'}</p>
                  <p className="font-medium">{viewComplaint.feedback?.customer_name}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'الجوال' : 'Phone'}</p>
                  <p className="font-medium" dir="ltr">{viewComplaint.feedback?.customer_phone}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'الفرع' : 'Branch'}</p>
                  <p className="font-medium">{isAr ? (viewComplaint.branch?.name_ar || viewComplaint.branch?.name) : viewComplaint.branch?.name}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'التاريخ' : 'Date'}</p>
                  <p className="font-medium">{format(new Date(viewComplaint.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">
                  {viewComplaint.type === 'suggestion' ? (isAr ? 'نص الاقتراح' : 'Suggestion') : (isAr ? 'نص الشكوى' : 'Complaint')}
                </p>
                <p className="text-sm">{viewComplaint.complaint_text}</p>
              </div>
              {viewComplaint.resolution_notes && (
                <div className="p-4 bg-[hsl(var(--score-excellent))]/5 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">{isAr ? 'ملاحظات الحل' : 'Resolution Notes'}</p>
                  <p className="text-sm">{viewComplaint.resolution_notes}</p>
                </div>
              )}
              {viewComplaint.status === 'new' && (isAdmin || isBranchManager) && (
                <Button className="w-full" onClick={() => setAssignOpen(true)}>
                  <UserPlus className="w-4 h-4 me-2" />
                  {isAr ? 'تعيين لموظف' : 'Assign to Employee'}
                </Button>
              )}
              {viewComplaint.status === 'in_progress' && viewComplaint.assigned_to === user?.id && (
                <Button className="w-full" onClick={() => setResolveOpen(true)}>
                  <CheckCircle2 className="w-4 h-4 me-2" />
                  {viewComplaint.type === 'suggestion' ? (isAr ? 'معالجة الاقتراح' : 'Process Suggestion') : (isAr ? 'حل الشكوى' : 'Resolve Complaint')}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعيين' : 'Assign'}</DialogTitle>
          </DialogHeader>
          <Select value={assignUserId} onValueChange={setAssignUserId}>
            <SelectTrigger>
              <SelectValue placeholder={isAr ? 'اختر الموظف' : 'Select employee'} />
            </SelectTrigger>
            <SelectContent>
              {branchEmployees?.map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={handleAssign} disabled={!assignUserId || updateMutation.isPending}>
              {isAr ? 'تعيين' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'حل' : 'Resolve'}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={isAr ? 'ملاحظات الحل...' : 'Resolution notes...'}
            value={resolveNotes}
            onChange={e => setResolveNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button onClick={handleResolve} disabled={updateMutation.isPending}>
              {isAr ? 'حل' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
