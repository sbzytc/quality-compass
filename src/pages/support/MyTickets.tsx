import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Info, Image as ImageIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

export default function MyTickets() {
  const { t, direction } = useLanguage();
  const { tickets, isLoading, createTicket } = useSupportTickets();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTicket.mutateAsync({ title, description, priority: priority as any });
      toast.success(direction === 'rtl' ? 'تم إنشاء التذكرة بنجاح' : 'Ticket created successfully');
      setIsOpen(false);
      setTitle('');
      setDescription('');
    } catch (error) {
      toast.error(direction === 'rtl' ? 'فشل إنشاء التذكرة' : 'Failed to create ticket');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="destructive">{direction === 'rtl' ? 'مفتوحة' : 'Open'}</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">{direction === 'rtl' ? 'قيد التنفيذ' : 'In Progress'}</Badge>;
      case 'resolved': return <Badge variant="secondary" className="bg-score-excellent/20 text-score-excellent hover:bg-score-excellent/30">{direction === 'rtl' ? 'محلولة' : 'Resolved'}</Badge>;
      case 'closed': return <Badge variant="secondary">{direction === 'rtl' ? 'مغلقة' : 'Closed'}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Only show tickets created by the user, if the user is a standard employee
  // The hook fetches all tickets based on RLS, which already filters for branch/user appropriately.

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.support.myTickets')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{direction === 'rtl' ? 'تتبع طلبات الدعم الفني الخاصة بك وارفع بلاغات عن المشاكل' : 'Track your support requests and report issues'}</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="w-4 h-4 mr-2" /> {direction === 'rtl' ? 'تذكرة جديدة' : 'New Ticket'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{direction === 'rtl' ? 'إنشاء تذكرة دعم' : 'Create Support Ticket'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{direction === 'rtl' ? 'العنوان المرجعي' : 'Subject / Title'}</label>
                <Input placeholder={direction === 'rtl' ? 'مثال: مشكلة في تقييم الفرع' : 'e.g. Issue with branch evaluation'} value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{direction === 'rtl' ? 'وصف المشكلة بالتفصيل' : 'Detailed Description'}</label>
                <Textarea placeholder={direction === 'rtl' ? 'اشرح المشكلة التي تواجهك...' : 'Describe the issue you are facing...'} value={description} onChange={e => setDescription(e.target.value)} required rows={5} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{direction === 'rtl' ? 'مستوى الأهمية' : 'Priority'}</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{direction === 'rtl' ? 'منخفضة' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{direction === 'rtl' ? 'متوسطة' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{direction === 'rtl' ? 'عالية' : 'High'}</SelectItem>
                    <SelectItem value="critical">{direction === 'rtl' ? 'حرجة (مستعجلة)' : 'Critical'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createTicket.isPending}>
                {createTicket.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><p className="text-muted-foreground">{t('common.loading')}</p></div>
      ) : tickets?.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-lg border border-dashed">
          <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">{direction === 'rtl' ? 'لا توجد تذاكر حالياً' : 'No tickets found'}</h3>
          <p className="text-muted-foreground mt-1">{direction === 'rtl' ? 'يمكنك رفع تذكرة جديدة لأي مشكلة تواجهك' : 'You can open a new ticket for any issue you face'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tickets?.map(ticket => (
            <Card key={ticket.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base line-clamp-1 leading-tight" title={ticket.title}>{ticket.title}</CardTitle>
                </div>
                <div className="mt-2 flex gap-2">
                  {getStatusBadge(ticket.status)}
                  <Badge variant="outline" className="capitalize">{ticket.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {ticket.description}
                </p>
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t">
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  <span>{ticket.id.split('-')[0].toUpperCase()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}