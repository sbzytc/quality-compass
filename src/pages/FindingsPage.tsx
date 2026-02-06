import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFindings, useFindingStats } from '@/hooks/useFindings';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function FindingsPage() {
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const { data: findings, isLoading: findingsLoading } = useFindings(
    activeTab !== 'all' ? { status: activeTab } : undefined
  );
  const { data: stats, isLoading: statsLoading } = useFindingStats();

  const isLoading = findingsLoading || statsLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-score-critical/10 text-score-critical border-score-critical/20';
      case 'in_progress':
        return 'bg-score-average/10 text-score-average border-score-average/20';
      case 'resolved':
        return 'bg-score-excellent/10 text-score-excellent border-score-excellent/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'open': return 'مفتوح';
        case 'in_progress': return 'قيد المعالجة';
        case 'resolved': return 'تم الحل';
        default: return status;
      }
    }
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'ar' ? 'الملاحظات' : 'Findings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'جميع الملاحظات من التقييمات' : 'All findings from evaluations'}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-score-critical/10 border border-score-critical/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-score-critical/20">
                <AlertTriangle className="w-6 h-6 text-score-critical" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'مفتوح' : 'Open'}
                </p>
                <p className="text-2xl font-bold text-foreground">{stats?.open || 0}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-score-average/10 border border-score-average/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-score-average/20">
                <Clock className="w-6 h-6 text-score-average" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'قيد المعالجة' : 'In Progress'}
                </p>
                <p className="text-2xl font-bold text-foreground">{stats?.inProgress || 0}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-score-excellent/10 border border-score-excellent/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-score-excellent/20">
                <CheckCircle2 className="w-6 h-6 text-score-excellent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'تم الحل' : 'Resolved'}
                </p>
                <p className="text-2xl font-bold text-foreground">{stats?.resolved || 0}</p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Tabs and Findings List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">
            {language === 'ar' ? 'الكل' : 'All'} ({stats?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="open">
            {language === 'ar' ? 'مفتوح' : 'Open'} ({stats?.open || 0})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            {language === 'ar' ? 'قيد المعالجة' : 'In Progress'} ({stats?.inProgress || 0})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            {language === 'ar' ? 'تم الحل' : 'Resolved'} ({stats?.resolved || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {findingsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : findings && findings.length > 0 ? (
              <div className="divide-y divide-border">
                {findings.map((finding, index) => (
                  <motion.div
                    key={finding.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/branches/${finding.branchId}`)}
                    className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {finding.criterionName}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`shrink-0 ${getStatusColor(finding.status)}`}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(finding.status)}
                              {getStatusLabel(finding.status)}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {finding.categoryName}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">{language === 'ar' ? 'الفرع:' : 'Branch:'}</span>
                            {finding.branchName}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium">{language === 'ar' ? 'الدرجة:' : 'Score:'}</span>
                            {finding.score}/{finding.maxScore}
                          </span>
                          <span>
                            {format(new Date(finding.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {finding.assessorNotes && (
                          <p className="mt-2 text-sm text-muted-foreground italic line-clamp-2">
                            "{finding.assessorNotes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد ملاحظات' : 'No findings found'}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
