import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluations } from '@/hooks/useEvaluations';
import { ClipboardCheck, Search, Eye, Pencil, Clock, Calendar, Building2, User } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
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

export default function PreviousEvaluationsPage() {
  const { t, language, direction } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: evaluations, isLoading } = useEvaluations();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const dateLocale = language === 'ar' ? ar : enUS;

  // Filter evaluations
  const filteredEvaluations = evaluations?.filter(evaluation => {
    const matchesSearch = 
      evaluation.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.assessorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Check if user can edit an evaluation (own evaluation within 24 hours of submission)
  const canEdit = (evaluation: typeof filteredEvaluations[0]) => {
    if (!user) return false;
    
    // Must be the owner
    if (evaluation.assessorId !== user.id) return false;
    
    // Must be within 24 hours of submission (or draft status)
    if (evaluation.status === 'draft') return true;
    
    if (evaluation.submittedAt) {
      const hoursSinceSubmission = differenceInHours(new Date(), new Date(evaluation.submittedAt));
      return hoursSinceSubmission <= 24;
    }
    
    return false;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-primary/10 text-primary border-0">{language === 'ar' ? 'مرسل' : 'Submitted'}</Badge>;
      case 'draft':
        return <Badge variant="secondary">{language === 'ar' ? 'مسودة' : 'Draft'}</Badge>;
      case 'approved':
        return <Badge className="bg-score-excellent/10 text-score-excellent border-0">{language === 'ar' ? 'معتمد' : 'Approved'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewEdit = (evaluation: typeof filteredEvaluations[0], mode: 'view' | 'edit') => {
    navigate(`/evaluations/${evaluation.id}?mode=${mode}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('evaluations.previous.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('evaluations.previous.subtitle')}
        </p>
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
                <SelectItem value="approved">{language === 'ar' ? 'معتمد' : 'Approved'}</SelectItem>
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
                    const isOwner = user?.id === evaluation.assessorId;
                    
                    // Calculate remaining edit time
                    let remainingHours = 0;
                    if (isOwner && evaluation.submittedAt && evaluation.status !== 'draft') {
                      remainingHours = Math.max(0, 24 - differenceInHours(new Date(), new Date(evaluation.submittedAt)));
                    }
                    
                    return (
                      <TableRow key={evaluation.id}>
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
                        <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(evaluation.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {isEditable ? (
                              <div className="flex flex-col items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewEdit(evaluation, 'edit')}
                                  className="gap-1"
                                >
                                  <Pencil className="h-4 w-4" />
                                  {language === 'ar' ? 'تعديل' : 'Edit'}
                                </Button>
                                {remainingHours > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {language === 'ar' ? `${remainingHours} ساعة متبقية` : `${remainingHours}h left`}
                                  </span>
                                )}
                              </div>
                            ) : (
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
