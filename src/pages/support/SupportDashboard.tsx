import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Activity, Bug, Clock, CheckCircle } from 'lucide-react';
import { TicketDetailsDialog } from '@/components/TicketDetailsDialog';

export default function SupportDashboard() {
  const { t, direction } = useLanguage();
  const { tickets, isLoading, updateTicket } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const openTickets = tickets?.filter(t => t.status === 'open') || [];
  const inProgress = tickets?.filter(t => t.status === 'in_progress') || [];
  const resolved = tickets?.filter(t => t.status === 'resolved' || t.status === 'closed') || [];

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateTicket.mutateAsync({ id, status: status as any });
      toast.success(direction === 'rtl' ? 'تم التحديث' : 'Updated');
      setSelectedTicket(null);
    } catch (error) {
      toast.error(direction === 'rtl' ? 'فشل التحديث' : 'Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.support.dashboard')}</h1>
        <p className="text-muted-foreground">{direction === 'rtl' ? 'نظام إدارة الدعم الفني ومراقبة النظام' : 'Support management and system monitoring'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-full"><Bug className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{direction === 'rtl' ? 'مفتوحة' : 'Open'}</p>
              <h3 className="text-2xl font-bold">{openTickets.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-full"><Clock className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{direction === 'rtl' ? 'قيد التنفيذ' : 'In Progress'}</p>
              <h3 className="text-2xl font-bold">{inProgress.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-score-excellent/10 text-score-excellent rounded-full"><CheckCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{direction === 'rtl' ? 'محلولة' : 'Resolved'}</p>
              <h3 className="text-2xl font-bold">{resolved.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/20 text-primary rounded-full"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-primary">{direction === 'rtl' ? 'حالة النظام' : 'System Status'}</p>
              <h3 className="text-lg font-bold text-primary">{direction === 'rtl' ? 'مستقر' : 'Stable'}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{direction === 'rtl' ? 'جميع التذاكر' : 'All Tickets'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : tickets?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
          ) : (
            <div className="space-y-4">
              {tickets?.map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{ticket.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{ticket.creator?.full_name || 'User'}</span>
                      <span>•</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <Badge variant="outline">{ticket.source}</Badge>
                      <span>•</span>
                      <span className="capitalize">{ticket.priority} Priority</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ms-4">
                    <Badge variant={ticket.status === 'open' ? 'destructive' : ticket.status === 'resolved' || ticket.status === 'closed' ? 'default' : 'secondary'} className="capitalize">
                      {ticket.status === 'open' ? (direction === 'rtl' ? 'مفتوحة' : 'Open') : 
                       ticket.status === 'in_progress' ? (direction === 'rtl' ? 'قيد التنفيذ' : 'In Progress') : 
                       ticket.status === 'resolved' ? (direction === 'rtl' ? 'محلولة' : 'Resolved') : 
                       ticket.status === 'closed' ? (direction === 'rtl' ? 'مغلقة' : 'Closed') : 
                       String(ticket.status).replace('_', ' ')}
                    </Badge>
                    
                    <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                      {direction === 'rtl' ? 'إدارة' : 'Manage'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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