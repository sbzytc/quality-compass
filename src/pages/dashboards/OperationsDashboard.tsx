import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Wrench, Calendar, FileWarning } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OperationsDashboard() {
  const navigate = useNavigate();
  const { t, direction } = useLanguage();

  const tasks = [
    { id: 1, title: 'Equipment maintenance - Refrigerator A', status: 'in_progress', assignee: 'Ahmad', dueDate: '2026-02-08' },
    { id: 2, title: 'Safety inspection follow-up', status: 'pending', assignee: 'Fatima', dueDate: '2026-02-10' },
    { id: 3, title: 'Update cleaning schedule', status: 'completed', assignee: 'Omar', dueDate: '2026-02-05' },
    { id: 4, title: 'Pest control coordination', status: 'pending', assignee: 'Sara', dueDate: '2026-02-12' },
    { id: 5, title: 'Staff uniform inspection', status: 'in_progress', assignee: 'Khalid', dueDate: '2026-02-09' },
  ];

  const upcomingInspections = [
    { id: 1, type: 'Health & Safety', date: '2026-02-15', inspector: 'External' },
    { id: 2, type: 'Quality Audit', date: '2026-02-20', inspector: 'Internal' },
    { id: 3, type: 'Fire Safety', date: '2026-02-28', inspector: 'External' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-score-excellent/10 text-score-excellent';
      case 'in_progress': return 'bg-score-average/10 text-score-average';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('status.completed');
      case 'in_progress': return t('status.inProgress');
      default: return t('status.pending');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.operations.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.operations.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {t('common.lastUpdated')}: {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.operations.openTasks')}
          value={tasks.filter(t => t.status !== 'completed').length}
          subtitle={t('dashboard.operations.requiresAction')}
          icon={Wrench}
          variant="average"
        />
        <StatCard
          title={t('dashboard.operations.completedToday')}
          value={3}
          subtitle={t('dashboard.operations.tasksCompleted')}
          icon={CheckCircle2}
          variant="good"
        />
        <StatCard
          title={t('dashboard.operations.upcomingInspections')}
          value={upcomingInspections.length}
          subtitle={t('dashboard.operations.thisMonth')}
          icon={Calendar}
        />
        <StatCard
          title={t('dashboard.operations.openFindings')}
          value={7}
          subtitle={t('dashboard.operations.fromLastAudit')}
          icon={FileWarning}
          variant="critical"
        />
      </div>

      {/* Task List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.operations.taskList')}</h2>
          <button className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors">
            + {t('dashboard.operations.addTask')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className={`text-${direction === 'rtl' ? 'right' : 'left'} px-6 py-3 text-sm font-medium text-muted-foreground`}>
                  {t('common.task')}
                </th>
                <th className={`text-${direction === 'rtl' ? 'right' : 'left'} px-6 py-3 text-sm font-medium text-muted-foreground`}>
                  {t('common.assignee')}
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                  {t('common.status')}
                </th>
                <th className={`text-${direction === 'rtl' ? 'right' : 'left'} px-6 py-3 text-sm font-medium text-muted-foreground`}>
                  {t('common.dueDate')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-6 py-4 font-medium text-foreground">{task.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{task.assignee}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Inspections */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.operations.upcomingInspections')}</h2>
        </div>
        <div className="divide-y divide-border">
          {upcomingInspections.map((inspection) => (
            <div key={inspection.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div>
                <h4 className="font-medium text-foreground">{inspection.type}</h4>
                <p className="text-sm text-muted-foreground">{inspection.inspector}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{format(new Date(inspection.date), 'MMM d, yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
