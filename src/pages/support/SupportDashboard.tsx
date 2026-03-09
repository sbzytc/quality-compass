import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupportTickets, SupportTicket, TicketStatus } from '@/hooks/useSupportTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Bug, 
  Clock, 
  CheckCircle, 
  Activity,
  TrendingUp,
  Timer,
  AlertCircle,
  Hourglass,
  XCircle,
  ArrowRight,
  ArrowLeft,
  User,
  Calendar
} from 'lucide-react';
import { TicketDetailsDialog } from '@/components/TicketDetailsDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

// Kanban column configuration
const KANBAN_COLUMNS: { status: TicketStatus; labelAr: string; labelEn: string; headerClass: string; iconBgClass: string; iconClass: string; icon: React.ElementType }[] = [
  { status: 'open', labelAr: 'مفتوحة', labelEn: 'Open', headerClass: 'bg-destructive/10', iconBgClass: 'bg-destructive/20', iconClass: 'text-destructive', icon: Bug },
  { status: 'in_progress', labelAr: 'قيد التنفيذ', labelEn: 'In Progress', headerClass: 'bg-primary/10', iconBgClass: 'bg-primary/20', iconClass: 'text-primary', icon: Clock },
  { status: 'pending_closure', labelAr: 'بانتظار الإغلاق', labelEn: 'Pending Closure', headerClass: 'bg-secondary/50', iconBgClass: 'bg-secondary', iconClass: 'text-secondary-foreground', icon: Hourglass },
  { status: 'resolved', labelAr: 'محلولة', labelEn: 'Resolved', headerClass: 'bg-score-excellent/10', iconBgClass: 'bg-score-excellent/20', iconClass: 'text-score-excellent', icon: CheckCircle },
  { status: 'closed', labelAr: 'مغلقة', labelEn: 'Closed', headerClass: 'bg-muted', iconBgClass: 'bg-muted-foreground/20', iconClass: 'text-muted-foreground', icon: XCircle },
];

export default function SupportDashboard() {
  const { t, direction } = useLanguage();
  const { tickets, isLoading, updateTicket } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!tickets) return null;
    
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const pendingClosure = tickets.filter(t => t.status === 'pending_closure').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    
    // Calculate resolution rate
    const resolvedTotal = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((resolvedTotal / total) * 100) : 0;
    
    // Calculate average resolution time (in hours) for resolved tickets
    const resolvedTickets = tickets.filter(t => t.resolved_at);
    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at);
        const resolved = new Date(t.resolved_at!);
        return sum + differenceInHours(resolved, created);
      }, 0);
      avgResolutionTime = Math.round(totalHours / resolvedTickets.length);
    }
    
    // Tickets created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const createdToday = tickets.filter(t => new Date(t.created_at) >= today).length;
    
    // Critical tickets
    const critical = tickets.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length;
    
    return {
      total,
      open,
      inProgress,
      pendingClosure,
      resolved,
      closed,
      resolutionRate,
      avgResolutionTime,
      createdToday,
      critical
    };
  }, [tickets]);

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<TicketStatus, SupportTicket[]> = {
      open: [],
      in_progress: [],
      pending_closure: [],
      resolved: [],
      closed: []
    };
    
    tickets?.forEach(ticket => {
      if (grouped[ticket.status]) {
        grouped[ticket.status].push(ticket);
      }
    });
    
    return grouped;
  }, [tickets]);

  const handleMoveTicket = async (ticket: SupportTicket, newStatus: TicketStatus) => {
    try {
      await updateTicket.mutateAsync({ id: ticket.id, status: newStatus });
      toast.success(direction === 'rtl' ? 'تم نقل التذكرة' : 'Ticket moved');
    } catch (error) {
      toast.error(direction === 'rtl' ? 'فشل نقل التذكرة' : 'Failed to move ticket');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-destructive/20 text-destructive';
      case 'medium': return 'bg-primary/20 text-primary';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      critical: { ar: 'حرجة', en: 'Critical' },
      high: { ar: 'عالية', en: 'High' },
      medium: { ar: 'متوسطة', en: 'Medium' },
      low: { ar: 'منخفضة', en: 'Low' }
    };
    return labels[priority]?.[direction === 'rtl' ? 'ar' : 'en'] || priority;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.support.dashboard')}</h1>
          <p className="text-muted-foreground">
            {direction === 'rtl' ? 'إدارة ومتابعة تذاكر الدعم الفني' : 'Manage and track support tickets'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-score-excellent/10 text-score-excellent rounded-full">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">{direction === 'rtl' ? 'النظام مستقر' : 'System Stable'}</span>
          </div>
        </div>
      </div>

      {/* Vital Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Open */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl">
                <Bug className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {direction === 'rtl' ? 'تحتاج متابعة' : 'Needs Attention'}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-destructive">{(stats?.open || 0) + (stats?.inProgress || 0)}</h3>
                  {stats?.critical ? (
                    <span className="text-xs text-destructive font-medium">
                      ({stats.critical} {direction === 'rtl' ? 'حرجة' : 'critical'})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Rate */}
        <Card className="border-score-excellent/30 bg-score-excellent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-score-excellent/10 text-score-excellent rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {direction === 'rtl' ? 'معدل الحل' : 'Resolution Rate'}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-score-excellent">{stats?.resolutionRate || 0}%</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Resolution Time */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Timer className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {direction === 'rtl' ? 'متوسط وقت الحل' : 'Avg Resolution Time'}
                </p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-bold">{stats?.avgResolutionTime || 0}</h3>
                  <span className="text-sm text-muted-foreground">{direction === 'rtl' ? 'ساعة' : 'hrs'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Created Today */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {direction === 'rtl' ? 'تذاكر اليوم' : 'Today\'s Tickets'}
                </p>
                <h3 className="text-2xl font-bold">{stats?.createdToday || 0}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Resolved */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-muted text-muted-foreground rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {direction === 'rtl' ? 'إجمالي المحلولة' : 'Total Resolved'}
                </p>
                <h3 className="text-2xl font-bold">{(stats?.resolved || 0) + (stats?.closed || 0)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {direction === 'rtl' ? 'لوحة التذاكر' : 'Ticket Board'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{stats?.total || 0} {direction === 'rtl' ? 'تذكرة' : 'tickets'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="flex gap-4 p-4 min-w-max">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.status}
                  column={column}
                  tickets={ticketsByStatus[column.status]}
                  direction={direction}
                  onTicketClick={setSelectedTicket}
                  onMoveTicket={handleMoveTicket}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <TicketDetailsDialog 
        ticket={selectedTicket} 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
        isSupportAgent={true}
      />
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({
  column,
  tickets,
  direction,
  onTicketClick,
  onMoveTicket,
  getPriorityColor,
  getPriorityLabel
}: {
  column: typeof KANBAN_COLUMNS[0];
  tickets: SupportTicket[];
  direction: string;
  onTicketClick: (ticket: SupportTicket) => void;
  onMoveTicket: (ticket: SupportTicket, status: TicketStatus) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
}) {
  const Icon = column.icon;
  const columnIndex = KANBAN_COLUMNS.findIndex(c => c.status === column.status);
  const canMoveLeft = columnIndex > 0;
  const canMoveRight = columnIndex < KANBAN_COLUMNS.length - 1;

  return (
    <div className="w-72 flex-shrink-0">
      {/* Column Header */}
      <div className={`flex items-center gap-2 p-3 rounded-t-lg bg-${column.color}/10`}>
        <div className={`p-1.5 rounded-lg bg-${column.color}/20`}>
          <Icon className={`w-4 h-4 text-${column.color === 'muted' ? 'muted-foreground' : column.color}`} />
        </div>
        <span className="font-semibold text-sm">
          {direction === 'rtl' ? column.labelAr : column.labelEn}
        </span>
        <Badge variant="secondary" className="ms-auto text-xs">
          {tickets.length}
        </Badge>
      </div>

      {/* Column Content */}
      <ScrollArea className="h-[500px] border border-t-0 rounded-b-lg bg-muted/30">
        <div className="p-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {direction === 'rtl' ? 'لا توجد تذاكر' : 'No tickets'}
              </div>
            ) : (
              tickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => onTicketClick(ticket)}
                >
                  {/* Priority Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityColor(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      #{ticket.id.slice(0, 6)}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-medium text-sm line-clamp-2 mb-2">{ticket.title}</h4>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {ticket.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[80px]">{ticket.creator?.full_name || 'User'}</span>
                    </div>
                    <span>
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                        locale: direction === 'rtl' ? ar : enUS
                      })}
                    </span>
                  </div>

                  {/* Quick Move Buttons */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                    {canMoveLeft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveTicket(ticket, KANBAN_COLUMNS[columnIndex - 1].status);
                        }}
                      >
                        {direction === 'rtl' ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                      </Button>
                    )}
                    <div className="flex-1" />
                    {canMoveRight && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveTicket(ticket, KANBAN_COLUMNS[columnIndex + 1].status);
                        }}
                      >
                        {direction === 'rtl' ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
