import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluations, useArchiveEvaluations, useDeleteEvaluation } from '@/hooks/useEvaluations';
import { ClipboardCheck, Search, Eye, Pencil, Clock, Calendar, Building2, User, Archive, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInHours } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PreviousEvaluationsPage() {
  const { t, language, direction } = useLanguage();
  const { user, profile, isBranchManager, isAdmin, isAssessor } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: evaluations, isLoading } = useEvaluations();
  const archiveMutation = useArchiveEvaluations();
  const deleteMutation = useDeleteEvaluation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const dateLocale = language === 'ar' ? ar : enUS;

  // Filter evaluations
  const filteredEvaluations = evaluations?.filter(evaluation => {
    // Branch managers can only see their branch's evaluations
    if (isBranchManager && !isAdmin && !isAssessor && profile?.branch_id) {
      if (evaluation.branchId !== profile.branch_id) return false;
    }

    const matchesSearch = 
      evaluation.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.assessorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Get only completed (submitted) evaluations for archiving
  const completedEvaluations = filteredEvaluations.filter(e => e.status === 'submitted');

  // Check if user can edit an evaluation (own evaluation within time limit)
  const canEdit = (evaluation: typeof filteredEvaluations[0]) => {
    if (!user) return false;
    if (evaluation.assessorId !== user.id) return false;
    
    if (evaluation.status === 'draft') {
      const hoursSinceCreation = differenceInHours(new Date(), new Date(evaluation.createdAt));
      return hoursSinceCreation <= 24;
    }
    
    if (evaluation.submittedAt) {
      const hoursSinceSubmission = differenceInHours(new Date(), new Date(evaluation.submittedAt));
      return hoursSinceSubmission <= 24;
    }
    
    return false;
  };

  // Check if user can delete (only drafts they own)
  const canDelete = (evaluation: typeof filteredEvaluations[0]) => {
    if (!user) return false;
    return evaluation.assessorId === user.id && evaluation.status === 'draft';
  };

  const getRemainingTimeInfo = (evaluation: typeof filteredEvaluations[0]) => {
    if (!user || evaluation.assessorId !== user.id) return null;
    
    if (evaluation.status === 'draft') {
      const hoursSinceCreation = differenceInHours(new Date(), new Date(evaluation.createdAt));
      const remainingHours = Math.max(0, 5 - hoursSinceCreation);
      if (remainingHours > 0) {
        return { hours: remainingHours, type: 'draft' as const, expired: false };
      }
      return { hours: 0, type: 'draft' as const, expired: true };
    }
    
    if (evaluation.status === 'submitted' && evaluation.submittedAt) {
      const hoursSinceSubmission = differenceInHours(new Date(), new Date(evaluation.submittedAt));
      const remainingHours = Math.max(0, 24 - hoursSinceSubmission);
      if (remainingHours > 0) {
        return { hours: remainingHours, type: 'submitted' as const, expired: false };
      }
      return { hours: 0, type: 'submitted' as const, expired: true };
    }
    
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-primary/10 text-primary border-0">{language === 'ar' ? 'مرسل' : 'Submitted'}</Badge>;
      case 'draft':
        return <Badge variant="secondary">{language === 'ar' ? 'مسودة' : 'Draft'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewEdit = (evaluation: typeof filteredEvaluations[0], mode: 'view' | 'edit') => {
    if (evaluation.status === 'draft' && mode === 'edit') {
      navigate(`/evaluations/new?draft=${evaluation.id}`);
    } else {
      navigate(`/evaluations/${evaluation.id}?mode=${mode}`);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleArchive = async () => {
    if (selectedIds.length === 0) return;
    
    // Only archive submitted evaluations
    const validIds = selectedIds.filter(id => 
      completedEvaluations.some(e => e.id === id)
    );
    
    if (validIds.length === 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يمكن أرشفة التقييمات المكتملة فقط' 
          : 'Only completed evaluations can be archived',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await archiveMutation.mutateAsync(validIds);
      toast({
        title: language === 'ar' ? 'تم الأرشفة' : 'Archived',
        description: language === 'ar' 
          ? `تم أرشفة ${validIds.length} تقييم(ات)` 
          : `${validIds.length} evaluation(s) archived`,
      });
      setSelectedIds([]);
    } catch {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في الأرشفة' : 'Failed to archive',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف التقييم' : 'Evaluation deleted',
      });
    } catch {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في الحذف' : 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('evaluations.previous.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('evaluations.previous.subtitle')}
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button 
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            {language === 'ar' 
              ? `إضافة للأرشيف (${selectedIds.length})` 
              : `Add to Archive (${selectedIds.length})`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={language === 'ar' ? 'البحث في التقييمات...' : 'Search evaluations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                <SelectItem value="submitted">{language === 'ar' ? 'مرسل' : 'Submitted'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {language === 'ar' ? 'التقييمات السابقة' : 'Previous Evaluations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'ar' ? 'لا توجد تقييمات سابقة' : 'No previous evaluations found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      {/* Checkbox header - only for submitted */}
                    </TableHead>
                    <TableHead>{language === 'ar' ? 'الفرع' : 'Branch'}</TableHead>
                    <TableHead>{language === 'ar' ? 'القالب' : 'Template'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المقيّم' : 'Assessor'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النتيجة' : 'Score'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => {
                    const isEditable = canEdit(evaluation);
                    const isDeletable = canDelete(evaluation);
                    const isOwner = user?.id === evaluation.assessorId;
                    const timeInfo = getRemainingTimeInfo(evaluation);
                    const isCompleted = evaluation.status === 'submitted';
                    
                    return (
                      <TableRow key={evaluation.id} className={timeInfo?.expired && evaluation.status === 'draft' ? 'opacity-60' : ''}>
                        <TableCell>
                          {isCompleted && (
                            <Checkbox
                              checked={selectedIds.includes(evaluation.id)}
                              onCheckedChange={(checked) => handleSelectOne(evaluation.id, !!checked)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{evaluation.branchName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{evaluation.templateName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{evaluation.assessorName}</span>
                            {isOwner && (
                              <Badge variant="outline" className="text-xs">
                                {language === 'ar' ? 'أنت' : 'You'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {evaluation.overallPercentage != null ? (
                            <span className="font-semibold">{Math.round(evaluation.overallPercentage)}%</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(evaluation.status)}
                            {evaluation.status === 'draft' && timeInfo && (
                              <span className={cn(
                                "text-xs flex items-center gap-1",
                                timeInfo.expired ? "text-destructive" : "text-score-average"
                              )}>
                                <Clock className="h-3 w-3" />
                                {timeInfo.expired 
                                  ? (language === 'ar' ? 'منتهية الصلاحية' : 'Expired')
                                  : (language === 'ar' ? `${timeInfo.hours} ساعة متبقية` : `${timeInfo.hours}h left`)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(evaluation.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {/* View button - always show for submitted evaluations */}
                            {evaluation.status !== 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewEdit(evaluation, 'view')}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                {language === 'ar' ? 'عرض' : 'View'}
                              </Button>
                            )}
                            {/* Edit/Continue button */}
                            {isEditable && !timeInfo?.expired && (
                              <div className="flex flex-col items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewEdit(evaluation, 'edit')}
                                  className="gap-1"
                                >
                                  <Pencil className="h-4 w-4" />
                                  {evaluation.status === 'draft' 
                                    ? (language === 'ar' ? 'إكمال' : 'Continue')
                                    : (language === 'ar' ? 'تعديل' : 'Edit')}
                                </Button>
                                {timeInfo && timeInfo.hours > 0 && timeInfo.type === 'submitted' && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {language === 'ar' ? `${timeInfo.hours} ساعة متبقية` : `${timeInfo.hours}h left`}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Delete button for drafts */}
                            {isDeletable && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {language === 'ar' ? 'حذف التقييم' : 'Delete Evaluation'}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {language === 'ar' 
                                        ? 'هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.'
                                        : 'Are you sure you want to delete this evaluation? This action cannot be undone.'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(evaluation.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {language === 'ar' ? 'حذف' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
