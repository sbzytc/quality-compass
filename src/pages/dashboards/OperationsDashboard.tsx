import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Clock, Wrench, Calendar, Plus,
  Trash2, ChevronDown, Building2, UserPlus, Target, Timer
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOperationsTasks, useOperationsTaskStats, useCreateTask, useUpdateTaskStatus, useDeleteTask } from '@/hooks/useOperationsTasks';
import { useBranches } from '@/hooks/useBranches';
import { useUsers } from '@/hooks/useUsers';
import { toast } from 'sonner';

export default function OperationsDashboard() {
  const { t, direction, language } = useLanguage();
  const isAr = language === 'ar';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBranchId, setNewBranchId] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');

  const filter = statusFilter !== 'all' ? { status: statusFilter } : undefined;
  const { data: tasks, isLoading: tasksLoading } = useOperationsTasks(filter);
  const { data: stats, isLoading: statsLoading } = useOperationsTaskStats();
  const { data: branches } = useBranches();
  const { data: users } = useUsers();
  const createMutation = useCreateTask();
  const updateStatusMutation = useUpdateTaskStatus();
  const deleteMutation = useDeleteTask();

  const isLoading = tasksLoading || statsLoading;

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createMutation.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        branchId: newBranchId || undefined,
        assignedTo: newAssignedTo || undefined,
        priority: newPriority,
        dueDate: newDueDate || undefined,
      });
      toast.success(isAr ? 'تم إضافة المهمة بنجاح' : 'Task created successfully');
      setAddDialogOpen(false);
      resetForm();
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to create task');
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewBranchId('');
    setNewAssignedTo('');
    setNewPriority('medium');
    setNewDueDate('');
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ taskId, status: newStatus });
      toast.success(isAr ? 'تم تحديث الحالة' : 'Status updated');
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to update');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteMutation.mutateAsync(taskId);
      toast.success(isAr ? 'تم حذف المهمة' : 'Task deleted');
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Failed to delete');
    }
  };

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'critical': return { label: isAr ? 'حرج' : 'Critical', color: 'bg-score-critical/10 text-score-critical border-score-critical/20' };
      case 'high': return { label: isAr ? 'عالي' : 'High', color: 'bg-score-weak/10 text-score-weak border-score-weak/20' };
      case 'medium': return { label: isAr ? 'متوسط' : 'Medium', color: 'bg-score-average/10 text-score-average border-score-average/20' };
      default: return { label: isAr ? 'منخفض' : 'Low', color: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed': return { label: isAr ? 'مكتمل' : 'Completed', color: 'bg-score-excellent/10 text-score-excellent', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      case 'in_progress': return { label: isAr ? 'قيد التنفيذ' : 'In Progress', color: 'bg-primary/10 text-primary', icon: <Timer className="w-3.5 h-3.5" /> };
      default: return { label: isAr ? 'معلق' : 'Pending', color: 'bg-muted text-muted-foreground', icon: <Clock className="w-3.5 h-3.5" /> };
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'd MMM yyyy', { locale: isAr ? ar : undefined });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.operations.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.operations.subtitle')}</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {isAr ? 'إضافة مهمة' : 'Add Task'}
        </Button>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          [
            { key: 'all', label: isAr ? 'الإجمالي' : 'Total', value: stats?.total || 0, icon: <Target className="w-4 h-4" />, style: 'bg-card border-border text-muted-foreground' },
            { key: 'pending', label: isAr ? 'معلق' : 'Pending', value: stats?.pending || 0, icon: <Clock className="w-4 h-4" />, style: 'bg-score-average/5 border-score-average/20 text-score-average' },
            { key: 'in_progress', label: isAr ? 'قيد التنفيذ' : 'In Progress', value: stats?.inProgress || 0, icon: <Timer className="w-4 h-4" />, style: 'bg-primary/5 border-primary/20 text-primary' },
            { key: 'completed', label: isAr ? 'مكتمل' : 'Completed', value: stats?.completed || 0, icon: <CheckCircle2 className="w-4 h-4" />, style: 'bg-score-excellent/5 border-score-excellent/20 text-score-excellent' },
            { key: 'overdue', label: isAr ? 'متأخر' : 'Overdue', value: stats?.overdue || 0, icon: <AlertTriangle className="w-4 h-4" />, style: 'bg-score-critical/5 border-score-critical/20 text-score-critical' },
          ].map((card, i) => (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setStatusFilter(card.key === 'overdue' ? 'all' : card.key)}
              className={`border rounded-xl p-4 flex flex-col text-start transition-all ${card.style} ${statusFilter === card.key ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
            >
              <div className="flex items-center gap-2 text-sm mb-1">
                {card.icon}
                {card.label}
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </motion.button>
          ))
        )}
      </div>

      {/* Task List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{isAr ? 'قائمة المهام' : 'Task List'}</h2>
        </div>

        {tasksLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const priority = getPriorityInfo(task.priority);
              const status = getStatusInfo(task.status);
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 hover:bg-muted/20 transition-colors ${task.status === 'completed' ? 'opacity-60' : ''} ${isOverdue ? 'border-s-4 border-s-score-critical' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-medium text-foreground ${task.status === 'completed' ? 'line-through' : ''}`}>
                          {task.title}
                        </h4>
                        <Badge variant="outline" className={`text-xs ${priority.color}`}>
                          {priority.label}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${status.color} flex items-center gap-1`}>
                          {status.icon} {status.label}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="outline" className="text-xs bg-score-critical/10 text-score-critical border-score-critical/20">
                            {isAr ? 'متأخر' : 'Overdue'}
                          </Badge>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {task.branchName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {isAr ? (task.branchNameAr || task.branchName) : task.branchName}
                          </span>
                        )}
                        {task.assignedToName && (
                          <span className="flex items-center gap-1">
                            <UserPlus className="w-3 h-3" />
                            {task.assignedToName}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-score-critical font-medium' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        <span>{formatDate(task.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Select
                        value={task.status}
                        onValueChange={(val) => handleStatusChange(task.id, val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{isAr ? 'معلق' : 'Pending'}</SelectItem>
                          <SelectItem value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                          <SelectItem value="completed">{isAr ? 'مكتمل' : 'Completed'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-score-critical"
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">
              {isAr ? 'لا توجد مهام' : 'No tasks yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? 'اضغط "إضافة مهمة" لإنشاء مهمة جديدة' : 'Click "Add Task" to create a new task'}
            </p>
          </div>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? 'إضافة مهمة جديدة' : 'Add New Task'}</DialogTitle>
            <DialogDescription>{isAr ? 'أدخل تفاصيل المهمة الجديدة' : 'Enter the details for the new task'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? 'عنوان المهمة *' : 'Task Title *'}</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={isAr ? 'مثال: فحص معدات المطبخ' : 'e.g. Kitchen equipment inspection'}
              />
            </div>

            <div className="space-y-2">
              <Label>{isAr ? 'الوصف' : 'Description'}</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder={isAr ? 'تفاصيل المهمة...' : 'Task details...'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? 'الفرع' : 'Branch'}</Label>
                <Select value={newBranchId} onValueChange={setNewBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? 'اختر الفرع' : 'Select branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.filter(b => b.isActive).map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {isAr ? (b.nameAr || b.name) : b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isAr ? 'الأولوية' : 'Priority'}</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{isAr ? 'منخفض' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{isAr ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{isAr ? 'عالي' : 'High'}</SelectItem>
                    <SelectItem value="critical">{isAr ? 'حرج' : 'Critical'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? 'تعيين إلى' : 'Assign To'}</Label>
                <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? 'اختر' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.filter(u => u.is_active).map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || createMutation.isPending}>
              {createMutation.isPending ? (isAr ? 'جاري الإضافة...' : 'Creating...') : (isAr ? 'إضافة' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
