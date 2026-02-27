import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle, Timer, Filter, Building2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CorrectiveActionRow {
  id: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  owner_id: string | null;
  non_conformity_id: string;
  non_conformities: {
    branch_id: string;
    criterion_id: string;
    score: number;
    max_score: number;
    status: string;
    resolved_by: string | null;
    resolved_at: string | null;
    resolution_notes: string | null;
    branches: { name: string; name_ar: string | null } | null;
    template_criteria: { name: string; name_ar: string | null } | null;
  } | null;
}

function useAllCorrectiveActions(statusFilter?: string) {
  return useQuery({
    queryKey: ['all-corrective-actions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('corrective_actions')
        .select(`
          *,
          non_conformities!inner (
            branch_id,
            criterion_id,
            score,
            max_score,
            status,
            resolved_by,
            resolved_at,
            resolution_notes,
            branches:branch_id (name, name_ar),
            template_criteria:criterion_id (name, name_ar)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CorrectiveActionRow[];
    },
  });
}

function useCorrectiveActionStats() {
  return useQuery({
    queryKey: ['corrective-action-stats'],
    queryFn: async () => {
      const statuses = ['pending', 'in_progress', 'completed', 'overdue'];
      const counts: Record<string, number> = {};

      for (const status of statuses) {
        const { count } = await supabase
          .from('corrective_actions')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);
        counts[status] = count || 0;
      }

      return {
        pending: counts.pending,
        inProgress: counts.in_progress,
        completed: counts.completed,
        overdue: counts.overdue,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
      };
    },
  });
}

export default function CorrectiveActionsPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/dashboard/ceo');
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('all');

  const { data: actions, isLoading: actionsLoading } = useAllCorrectiveActions(
    activeTab !== 'all' ? activeTab : undefined
  );
  const { data: stats, isLoading: statsLoading } = useCorrectiveActionStats();

  const isLoading = actionsLoading || statsLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-score-critical/10 text-score-critical border-score-critical/20';
      case 'pending':
        return 'bg-score-average/10 text-score-average border-score-average/20';
      case 'in_progress':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'completed':
        return 'bg-score-excellent/10 text-score-excellent border-score-excellent/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <Timer className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'overdue': return 'متأخر';
        case 'pending': return 'معلّق';
        case 'in_progress': return 'قيد التنفيذ';
        case 'completed': return 'مكتمل';
        default: return status;
      }
    }
    switch (status) {
      case 'overdue': return 'Overdue';
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-score-critical/10 text-score-critical border-score-critical/20';
      case 'high': return 'bg-score-weak/10 text-score-weak border-score-weak/20';
      case 'medium': return 'bg-score-average/10 text-score-average border-score-average/20';
      case 'low': return 'bg-score-good/10 text-score-good border-score-good/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority: string) => {
    if (language === 'ar') {
      switch (priority) {
        case 'critical': return 'حرج';
        case 'high': return 'عالي';
        case 'medium': return 'متوسط';
        case 'low': return 'منخفض';
        default: return priority;
      }
    }
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'ar' ? 'الإجراءات التصحيحية' : 'Corrective Actions'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'متابعة وإدارة جميع الإجراءات التصحيحية' : 'Track and manage all corrective actions'}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
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
                  {language === 'ar' ? 'متأخر' : 'Overdue'}
                </p>
                <p className="text-2xl font-bold text-foreground">{stats?.overdue || 0}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-score-average/10 border border-score-average/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-score-average/20">
                <Clock className="w-6 h-6 text-score-average" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'معلّق' : 'Pending'}
                </p>
                <p className="text-2xl font-bold text-foreground">{stats?.pending || 0}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-primary/20">
                <Timer className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
                </p>
                <p className="text-2xl font-bold text-foreground">{stats?.inProgress || 0}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-score-excellent/10 border border-score-excellent/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-score-excellent/20">
                <CheckCircle2 className="w-6 h-6 text-score-excellent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'مكتمل' : 'Completed'}
                </p>
                <p className="text-2xl font-bold text-foreground">{stats?.completed || 0}</p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Tabs and Actions List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto mb-6">
          <TabsList className="inline-flex w-full min-w-max">
            <TabsTrigger value="all" className="flex-1 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
              {language === 'ar' ? 'الكل' : 'All'} ({stats?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex-1 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
              {language === 'ar' ? 'متأخر' : 'Overdue'} ({stats?.overdue || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
              {language === 'ar' ? 'معلّق' : 'Pending'} ({stats?.pending || 0})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex-1 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
              {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'} ({stats?.inProgress || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
              {language === 'ar' ? 'مكتمل' : 'Completed'} ({stats?.completed || 0})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {actionsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : actions && actions.length > 0 ? (
              <div className="divide-y divide-border">
                {actions.map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: direction === 'rtl' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                      <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-foreground">
                            {action.non_conformities?.template_criteria
                              ? (language === 'ar'
                                ? action.non_conformities.template_criteria.name_ar || action.non_conformities.template_criteria.name
                                : action.non_conformities.template_criteria.name)
                              : action.description}
                          </h3>
                          <Badge variant="outline" className={`shrink-0 ${getStatusColor(action.status)}`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(action.status)}
                              {getStatusLabel(action.status)}
                            </span>
                          </Badge>
                          <Badge variant="outline" className={`shrink-0 ${getPriorityColor(action.priority)}`}>
                            {getPriorityLabel(action.priority)}
                          </Badge>
                          {action.non_conformities && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              <Target className="w-3 h-3 mr-1" />
                              {action.non_conformities.score}/{action.non_conformities.max_score}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                          {action.non_conformities?.branches && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {language === 'ar'
                                ? action.non_conformities.branches.name_ar || action.non_conformities.branches.name
                                : action.non_conformities.branches.name}
                            </span>
                          )}
                          {action.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(action.due_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          <span>
                            {format(new Date(action.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {action.non_conformities?.resolution_notes && action.status === 'completed' && (
                          <div className="mt-2 p-2 bg-score-excellent/5 border border-score-excellent/10 rounded text-xs">
                            <span className="font-medium text-score-excellent">{language === 'ar' ? 'ملاحظات الحل:' : 'Resolution:'}</span>{' '}
                            {action.non_conformities.resolution_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد إجراءات تصحيحية' : 'No corrective actions found'}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}