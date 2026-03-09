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
import { TicketDetailsDialog } from '@/components/TicketDetailsDialog';
import { SupportTicket } from '@/hooks/useSupportTickets';

export default function MyTickets() {
  const { t, direction } = useLanguage();
  const { tickets, isLoading, createTicket } = useSupportTickets();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [screenName, setScreenName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let attachments: string[] = [];
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('support-attachments')
          .getPublicUrl(fileName);

        attachments.push(publicUrlData.publicUrl);
      }

      await createTicket.mutateAsync({ 
        title, 
        description, 
        priority: priority as any,
        screen_name: screenName,
        attachments
      });
      toast.success(direction === 'rtl' ? 'تم إنشاء التذكرة بنجاح' : 'Ticket created successfully');
      setIsOpen(false);
      setTitle('');
      setDescription('');
      setScreenName('');
      setFile(null);
    } catch (error) {
      toast.error(direction === 'rtl' ? 'فشل إنشاء التذكرة' : 'Failed to create ticket');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="destructive">{direction === 'rtl' ? 'مفتوحة' : 'Open'}</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">{direction === 'rtl' ? 'قيد التنفيذ' : 'In Progress'}</Badge>;
      case 'resolved': return <Badge variant="secondary" className="bg-score-excellent/20 text-score-excellent hover:bg-score-excellent/30">{direction === 'rtl' ? 'محلولة' : 'Resolved'}</Badge>;
      case 'closed': return <Badge variant="secondary">{direction === 'rtl' ? 'مغلقة' : 'Closed'}</Badge>;
      default: return <Badge variant="secondary" className="capitalize">{status.replace('_', ' ')}</Badge>;
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
                <label className="text-sm font-medium">{direction === 'rtl' ? 'اسم الشاشة / الصفحة (اختياري)' : 'Screen / Page Name (Optional)'}</label>
                <Input placeholder={direction === 'rtl' ? 'أين تظهر المشكلة؟' : 'Where does the issue appear?'} value={screenName} onChange={e => setScreenName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{direction === 'rtl' ? 'وصف المشكلة بالتفصيل' : 'Detailed Description'}</label>
                <Textarea placeholder={direction === 'rtl' ? 'اشرح المشكلة التي تواجهك...' : 'Describe the issue you are facing...'} value={description} onChange={e => setDescription(e.target.value)} required rows={4} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{direction === 'rtl' ? 'إرفاق صورة (اختياري)' : 'Attach Image (Optional)'}</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="ticket-image-upload" 
                  />
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <label htmlFor="ticket-image-upload" className="cursor-pointer flex items-center justify-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      {file ? file.name : (direction === 'rtl' ? 'اختر صورة...' : 'Choose image...')}
                    </label>
                  </Button>
                  {file && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
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
              <Button type="submit" className="w-full" disabled={createTicket.isPending || uploading}>
                {uploading || createTicket.isPending ? t('common.loading') : t('common.save')}
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
            <Card key={ticket.id} className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTicket(ticket)}>
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
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {ticket.attachments.map((url: string, index: number) => (
                      <div key={index} className="flex-shrink-0 block w-12 h-12 rounded-md overflow-hidden border pointer-events-none">
                        <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {ticket.screen_name && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md mb-4 border">
                    <span className="font-medium">{direction === 'rtl' ? 'الشاشة:' : 'Screen:'}</span> {ticket.screen_name}
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t">
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  <span>{ticket.id.split('-')[0].toUpperCase()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TicketDetailsDialog 
        ticket={selectedTicket} 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
      />
    </div>
  );
}