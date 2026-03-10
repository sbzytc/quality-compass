import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Search, Filter, Clock, User, FileText, AlertTriangle, CheckCircle2, XCircle, UserPlus, Eye, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { format } from 'date-fns';

const ACTION_ICONS: Record<string, React.ElementType> = {
  assigned: UserPlus,
  resolved: CheckCircle2,
  approved: CheckCircle2,
  rejected: XCircle,
  manager_approved: Shield,
  manager_rejected: XCircle,
  created: FileText,
  updated: FileText,
  login: User,
  default: Activity,
};

const ACTION_COLORS: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  manager_approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  manager_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  created: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  login: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const ACTION_LABELS_AR: Record<string, string> = {
  assigned: 'تعيين',
  resolved: 'حل',
  approved: 'اعتماد (مقيم)',
  rejected: 'رفض (مقيم)',
  manager_approved: 'اعتماد (مدير)',
  manager_rejected: 'رفض (مدير)',
  created: 'إنشاء',
  updated: 'تحديث',
  login: 'تسجيل دخول',
  exported: 'تصدير',
};

const ENTITY_LABELS_AR: Record<string, string> = {
  finding: 'ملاحظة',
  evaluation: 'تقييم',
  user: 'مستخدم',
  branch: 'فرع',
  template: 'نموذج',
  ticket: 'تذكرة دعم',
  complaint: 'شكوى',
  suggestion: 'اقتراح',
  feedback: 'تقييم عميل',
  corrective_action: 'إجراء تصحيحي',
};

export default function SystemLogsPage() {
  const goBack = useGoBack('/dashboard/ceo');
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const [entityFilter, setEntityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading } = useSystemLogs({ entityType: entityFilter });

  const filteredLogs = (logs || []).filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.userName || '').toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.entityType.toLowerCase().includes(term) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className={`h-5 w-5 ${isAr ? 'rotate-180' : ''}`} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              {isAr ? 'سجل النظام' : 'System Logs'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'متابعة جميع العمليات والأحداث في النظام' : 'Track all system operations and events'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isAr ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={isAr ? 'بحث في السجلات...' : 'Search logs...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={isAr ? 'pr-9' : 'pl-9'}
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="finding">{isAr ? 'الملاحظات' : 'Findings'}</SelectItem>
              <SelectItem value="evaluation">{isAr ? 'التقييمات' : 'Evaluations'}</SelectItem>
              <SelectItem value="user">{isAr ? 'المستخدمين' : 'Users'}</SelectItem>
              <SelectItem value="ticket">{isAr ? 'تذاكر الدعم' : 'Tickets'}</SelectItem>
              <SelectItem value="complaint">{isAr ? 'الشكاوى' : 'Complaints'}</SelectItem>
              <SelectItem value="feedback">{isAr ? 'تقييمات العملاء' : 'Feedback'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isAr ? 'لا توجد سجلات' : 'No logs found'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log, index) => {
                const IconComp = ACTION_ICONS[log.action] || ACTION_ICONS.default;
                const colorClass = ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground';
                const actionLabel = isAr ? (ACTION_LABELS_AR[log.action] || log.action) : log.action;
                const entityLabel = isAr ? (ENTITY_LABELS_AR[log.entityType] || log.entityType) : log.entityType;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClass} shrink-0 mt-0.5`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground text-sm">
                            {log.userName || (isAr ? 'مستخدم غير معروف' : 'Unknown user')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {actionLabel}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {entityLabel}
                          </Badge>
                        </div>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        <span dir="ltr">{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
