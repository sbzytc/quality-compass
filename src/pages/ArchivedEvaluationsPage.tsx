import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArchivedEvaluations, useUnarchiveEvaluations } from '@/hooks/useEvaluations';
import { Archive, Search, Eye, ArchiveRestore, Calendar, Building2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ArchivedEvaluationsPage() {
  const { language, direction } = useLanguage();
  const { profile, isBranchManager, isAdmin, isAssessor } = useAuth();
  const navigate = useNavigate();
  const { data: evaluations, isLoading } = useArchivedEvaluations();
  const unarchiveMutation = useUnarchiveEvaluations();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
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
    
    return matchesSearch;
  }) || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEvaluations.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleUnarchive = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      await unarchiveMutation.mutateAsync(selectedIds);
      toast({
        title: language === 'ar' ? 'تم إلغاء الأرشفة' : 'Unarchived',
        description: language === 'ar' 
          ? `تم إلغاء أرشفة ${selectedIds.length} تقييم(ات)` 
          : `${selectedIds.length} evaluation(s) unarchived`,
      });
      setSelectedIds([]);
    } catch {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إلغاء الأرشفة' : 'Failed to unarchive',
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
            {language === 'ar' ? 'التقييمات المؤرشفة' : 'Archived Evaluations'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'عرض التقييمات المؤرشفة' : 'View archived evaluations'}
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button 
            onClick={handleUnarchive}
            disabled={unarchiveMutation.isPending}
            className="gap-2"
          >
            <ArchiveRestore className="h-4 w-4" />
            {language === 'ar' 
              ? `إلغاء أرشفة (${selectedIds.length})` 
              : `Unarchive (${selectedIds.length})`}
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={language === 'ar' ? 'البحث في التقييمات...' : 'Search evaluations...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            {language === 'ar' ? 'التقييمات المؤرشفة' : 'Archived Evaluations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'ar' ? 'لا توجد تقييمات مؤرشفة' : 'No archived evaluations found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredEvaluations.length && filteredEvaluations.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{language === 'ar' ? 'الفرع' : 'Branch'}</TableHead>
                    <TableHead>{language === 'ar' ? 'القالب' : 'Template'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المقيّم' : 'Assessor'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النتيجة' : 'Score'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(evaluation.id)}
                          onCheckedChange={(checked) => handleSelectOne(evaluation.id, !!checked)}
                        />
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(evaluation.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/evaluations/${evaluation.id}?mode=view`)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {language === 'ar' ? 'عرض' : 'View'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
