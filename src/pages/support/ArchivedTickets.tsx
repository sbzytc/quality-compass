import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Archive, Search, Clock } from 'lucide-react';
import { TicketDetailsDialog } from '@/components/TicketDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export default function ArchivedTickets() {
  const { t, direction } = useLanguage();
  const { tickets, isLoading } = useSupportTickets();
  const { isSupportAgent, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Filter for closed tickets that are older than 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const archivedTickets = tickets?.filter(ticket => {
    const isClosed = ticket.status === 'closed';
    const closedDate = ticket.resolved_at || ticket.updated_at;
    const isOldEnough = new Date(closedDate) < oneWeekAgo;
    return isClosed && isOldEnough;
  }) || [];

  // Apply search filter
  const filteredTickets = archivedTickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">{direction === 'rtl' ? 'حرجة' : 'Critical'}</Badge>;
      case 'high': return <Badge className="bg-orange-500/20 text-orange-600 hover:bg-orange-500/30">{direction === 'rtl' ? 'عالية' : 'High'}</Badge>;
      case 'medium': return <Badge variant="secondary">{direction === 'rtl' ? 'متوسطة' : 'Medium'}</Badge>;
      case 'low': return <Badge variant="outline">{direction === 'rtl' ? 'منخفضة' : 'Low'}</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-muted rounded-full">
            <Archive className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{direction === 'rtl' ? 'أرشيف التذاكر' : 'Archived Tickets'}</h1>
            <p className="text-muted-foreground text-sm">
              {direction === 'rtl' 
                ? 'التذاكر المغلقة التي مر عليها أكثر من أسبوع' 
                : 'Closed tickets older than one week'}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={direction === 'rtl' ? 'بحث...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-lg border border-dashed">
          <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">
            {direction === 'rtl' ? 'لا توجد تذاكر مؤرشفة' : 'No archived tickets'}
          </h3>
          <p className="text-muted-foreground mt-1">
            {direction === 'rtl' 
              ? 'ستظهر هنا التذاكر المغلقة بعد مرور أسبوع عليها' 
              : 'Closed tickets will appear here after one week'}
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{direction === 'rtl' ? 'التذاكر المؤرشفة' : 'Archived Tickets'}</span>
              <Badge variant="secondary">{filteredTickets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base truncate">{ticket.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{ticket.creator?.full_name || 'User'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {direction === 'rtl' ? 'أُغلقت ' : 'Closed '}
                        {formatDistanceToNow(new Date(ticket.resolved_at || ticket.updated_at), {
                          addSuffix: true,
                          locale: direction === 'rtl' ? ar : enUS
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ms-4">
                    {getPriorityBadge(ticket.priority)}
                    <Badge variant="outline" className="bg-muted">
                      {direction === 'rtl' ? 'مؤرشفة' : 'Archived'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TicketDetailsDialog 
        ticket={selectedTicket} 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
        isSupportAgent={isSupportAgent || isAdmin}
      />
    </div>
  );
}
