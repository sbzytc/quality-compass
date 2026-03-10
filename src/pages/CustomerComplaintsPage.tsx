import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Eye, Calendar, User, Building2, AlertCircle, CheckCircle2, Clock, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerComplaints, useUpdateComplaint, CustomerComplaint } from '@/hooks/useCustomerFeedback';
import { useBranches } from '@/hooks/useBranches';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CustomerComplaintsPage() {
  const { direction, language } = useLanguage();
  const isAr = language === 'ar';
  const { user, profile, roles } = useAuth();
  const isBranchManager = roles.includes('branch_manager');
  const isAdmin = roles.includes('admin');

  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
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

  const filteredComplaints = complaints?.filter(c => 
    activeTab === 'all' || c.status === activeTab
  );

  const statusTabs = [
    { key: 'all', label: isAr ? 'الكل' : 'All', count: complaints?.length || 0 },
    { key: 'new', label: isAr ? 'جديدة' : 'New', count: complaints?.filter(c => c.status === 'new').length || 0 },
    { key: 'in_progress', label: isAr ? 'قيد المعالجة' : 'In Progress', count: complaints?.filter(c => c.status === 'in_progress').length || 0 },
    { key: 'resolved', label: isAr ? 'تم الحل' : 'Resolved', count: complaints?.filter(c => c.status === 'resolved').length || 0 },
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

  // Get branch employees for assignment
  const branchEmployees = users?.filter(u => {
    if (!viewComplaint) return false;
    return u.branch_id === viewComplaint.branch_id;
  });

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{complaints?.filter(c => c.status === 'new').length || 0}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'شكاوى جديدة' : 'New Complaints'}</p>
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

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className="ms-2 text-xs">{tab.count}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Complaints List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !filteredComplaints?.length ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{isAr ? 'لا توجد شكاوى' : 'No complaints'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((complaint, i) => (
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
      )}

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تفاصيل الشكوى' : 'Complaint Details'}</DialogTitle>
          </DialogHeader>
          {viewComplaint && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(viewComplaint.status)}
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
                <p className="text-xs text-muted-foreground mb-1">{isAr ? 'نص الشكوى/الاقتراح' : 'Complaint/Suggestion'}</p>
                <p className="text-sm">{viewComplaint.complaint_text}</p>
              </div>
              {viewComplaint.resolution_notes && (
                <div className="p-4 bg-[hsl(var(--score-excellent))]/5 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">{isAr ? 'ملاحظات الحل' : 'Resolution Notes'}</p>
                  <p className="text-sm">{viewComplaint.resolution_notes}</p>
                </div>
              )}
              {/* Actions */}
              {viewComplaint.status === 'new' && (isAdmin || isBranchManager) && (
                <Button
                  className="w-full"
                  onClick={() => setAssignOpen(true)}
                >
                  <UserPlus className="w-4 h-4 me-2" />
                  {isAr ? 'تعيين لموظف' : 'Assign to Employee'}
                </Button>
              )}
              {viewComplaint.status === 'in_progress' && viewComplaint.assigned_to === user?.id && (
                <Button
                  className="w-full"
                  onClick={() => setResolveOpen(true)}
                >
                  <CheckCircle2 className="w-4 h-4 me-2" />
                  {isAr ? 'حل الشكوى' : 'Resolve Complaint'}
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
            <DialogTitle>{isAr ? 'تعيين الشكوى' : 'Assign Complaint'}</DialogTitle>
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
            <DialogTitle>{isAr ? 'حل الشكوى' : 'Resolve Complaint'}</DialogTitle>
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
