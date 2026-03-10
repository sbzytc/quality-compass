import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Eye, Calendar, User, Phone, Building2, TrendingUp, BarChart3, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerFeedbacks, useCustomerFeedbackDetail } from '@/hooks/useCustomerFeedback';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function CustomerFeedbackListPage() {
  const { direction, language } = useLanguage();
  const isAr = language === 'ar';
  const { profile, roles } = useAuth();
  const goBack = useGoBack('/dashboard/ceo');
  const isBranchManager = roles.includes('branch_manager');
  
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [detailId, setDetailId] = useState<string | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  const branchFilter = selectedBranch !== 'all' ? selectedBranch : 
    (isBranchManager && !roles.includes('admin') ? profile?.branch_id || undefined : undefined);
  
  const { data: feedbacks, isLoading } = useCustomerFeedbacks(branchFilter || undefined);
  const { data: branches } = useBranches();
  const { data: feedbackDetail } = useCustomerFeedbackDetail(detailId);

  const showBranchFilter = roles.includes('admin') || roles.includes('executive');

  // Stats
  const totalFeedbacks = feedbacks?.length || 0;
  const avgRating = feedbacks?.length
    ? (feedbacks.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / feedbacks.length).toFixed(1)
    : '0';

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const handleExportFeedbacks = async () => {
    if (!feedbacks?.length) {
      toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    // Fetch all scores with questions for export
    const feedbackIds = feedbacks.map(f => f.id);
    const { data: allScores } = await supabase
      .from('customer_feedback_scores')
      .select('feedback_id, score, question:customer_feedback_questions(question_text, question_text_ar)')
      .in('feedback_id', feedbackIds);

    // Get unique questions
    const questionsMap = new Map<string, string>();
    allScores?.forEach((s: any) => {
      const qText = isAr ? (s.question?.question_text_ar || s.question?.question_text) : s.question?.question_text;
      if (qText && !questionsMap.has(s.question?.question_text)) {
        questionsMap.set(s.question?.question_text, qText);
      }
    });
    const questionKeys = Array.from(questionsMap.keys());
    const questionLabels = Array.from(questionsMap.values());

    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'العميل' : 'Customer',
      isAr ? 'الجوال' : 'Phone',
      isAr ? 'الفرع' : 'Branch',
      isAr ? 'التقييم العام' : 'Overall Rating',
      ...questionLabels,
    ];

    const rows = feedbacks.map(fb => {
      const fbScores = allScores?.filter((s: any) => s.feedback_id === fb.id) || [];
      const scoreMap = new Map<string, number>();
      fbScores.forEach((s: any) => {
        scoreMap.set(s.question?.question_text, s.score);
      });

      return [
        format(new Date(fb.created_at), 'dd/MM/yyyy HH:mm'),
        fb.customer_name,
        fb.customer_phone,
        isAr ? (fb.branch?.name_ar || fb.branch?.name || '') : (fb.branch?.name || ''),
        fb.overall_rating?.toFixed(1) || '',
        ...questionKeys.map(q => scoreMap.get(q) ?? ''),
      ];
    });

    exportToExcel(headers, rows, `${isAr ? 'تقييمات-العملاء' : 'customer-feedback'}-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success(isAr ? 'تم التصدير بنجاح' : 'Exported successfully');
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5" dir="ltr">
        {[1,2,3,4,5].map(s => (
          <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'fill-[hsl(var(--accent))] text-[hsl(var(--accent))]' : 'text-gray-300'}`} />
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
            {isAr ? 'تقييمات العملاء' : 'Customer Feedback'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr ? 'عرض وإدارة تقييمات العملاء' : 'View and manage customer feedback'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportFeedbacks}>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFeedbacks}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'إجمالي التقييمات' : 'Total Feedbacks'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))]/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-[hsl(var(--accent))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgRating}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'متوسط التقييم' : 'Average Rating'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--score-excellent))]/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[hsl(var(--score-excellent))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {feedbacks?.filter(f => (f.overall_rating || 0) >= 4).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">{isAr ? 'تقييمات ممتازة' : 'Excellent Ratings'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !feedbacks?.length ? (
        <Card className="p-8 text-center">
          <Star className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{isAr ? 'لا توجد تقييمات بعد' : 'No feedback yet'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb, i) => (
            <motion.div
              key={fb.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(fb.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{fb.customer_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span dir="ltr">{fb.customer_phone}</span>
                        <span>•</span>
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(fb.created_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {fb.branch && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="w-3 h-3 me-1" />
                        {isAr ? (fb.branch.name_ar || fb.branch.name) : fb.branch.name}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      {renderStars(fb.overall_rating || 0)}
                      <span className="text-sm font-medium ms-1">{(fb.overall_rating || 0).toFixed(1)}</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تفاصيل التقييم' : 'Feedback Details'}</DialogTitle>
          </DialogHeader>
          {feedbackDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'العميل' : 'Customer'}</p>
                  <p className="font-medium">{feedbackDetail.customer_name}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'الجوال' : 'Phone'}</p>
                  <p className="font-medium" dir="ltr">{feedbackDetail.customer_phone}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'الفرع' : 'Branch'}</p>
                  <p className="font-medium">{isAr ? (feedbackDetail.branch?.name_ar || feedbackDetail.branch?.name) : feedbackDetail.branch?.name}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{isAr ? 'التاريخ' : 'Date'}</p>
                  <p className="font-medium">{format(new Date(feedbackDetail.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>

              <div className="p-4 bg-[hsl(var(--accent))]/5 rounded-xl text-center">
                <p className="text-sm text-muted-foreground mb-1">{isAr ? 'التقييم العام' : 'Overall Rating'}</p>
                <div className="flex items-center justify-center gap-2">
                  {renderStars(feedbackDetail.overall_rating || 0)}
                  <span className="text-2xl font-bold">{(feedbackDetail.overall_rating || 0).toFixed(1)}</span>
                </div>
              </div>

              {feedbackDetail.scores?.map((score: any) => (
                <div key={score.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {isAr ? (score.question?.question_text_ar || score.question?.question_text) : score.question?.question_text}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderStars(score.score)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
