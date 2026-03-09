import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { SupportTicket, useTicketComments, useSupportTickets } from '@/hooks/useSupportTickets';
import { toast } from 'sonner';
import { X, Send, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface TicketDetailsDialogProps {
  ticket: SupportTicket | null;
  isOpen: boolean;
  onClose: () => void;
  isSupportAgent?: boolean;
}

export function TicketDetailsDialog({ ticket, isOpen, onClose, isSupportAgent = false }: TicketDetailsDialogProps) {
  const { t, direction } = useLanguage();
  const [newComment, setNewComment] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [commentPosted, setCommentPosted] = useState(false);
  const [tempStatus, setTempStatus] = useState<string>('');

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const isCloseConfirmOpen = !!pendingStatus;

  const closeConfirmCopy = useMemo(() => {
    const isArabic = direction === 'rtl';
    if (pendingStatus === 'pending_closure') {
      return {
        title: isArabic ? 'تأكيد طلب إغلاق التذكرة' : 'Confirm closure request',
        description: isArabic
          ? 'سيتم إرسال طلب للموظف للموافقة على الإغلاق النهائي. هل تريد الاستمرار؟'
          : 'A request will be sent to the employee for final approval. Do you want to continue?',
        confirm: isArabic ? 'نعم، إرسال الطلب' : 'Yes, send request',
        cancel: isArabic ? 'إلغاء' : 'Cancel',
      };
    }
    return {
      title: isArabic ? 'تأكيد إغلاق التذكرة' : 'Confirm closing ticket',
      description: isArabic
        ? 'هل أنت متأكد من رغبتك في إغلاق هذه التذكرة؟ بعد الإغلاق لن تتمكن من إضافة تعليقات.'
        : 'Are you sure you want to close this ticket? After closing, no new comments can be added.',
      confirm: isArabic ? 'نعم، أغلق التذكرة' : 'Yes, close ticket',
      cancel: isArabic ? 'إلغاء' : 'Cancel',
    };
  }, [direction, pendingStatus]);

  const { comments, isLoading, addComment } = useTicketComments(ticket?.id);
  const { updateTicket } = useSupportTickets();

  if (!ticket) return null;

  // Reset comment posted state when ticket changes or dialog opens
  React.useEffect(() => {
    setCommentPosted(false);
    setTempStatus(ticket?.status || '');
  }, [ticket?.id, isOpen]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment.mutateAsync({ comment: newComment });
      setNewComment('');
      setCommentPosted(true);
      setTempStatus(ticket.status); // Initialize temp status with current status
      toast.success(direction === 'rtl' ? 'تم نشر التعليق' : 'Comment posted');
    } catch (error) {
      toast.error(direction === 'rtl' ? 'فشل نشر التعليق' : 'Failed to post comment');
    }
  };

  const handleFinalSubmit = async () => {
    try {
      if (tempStatus !== ticket.status) {
        await updateTicket.mutateAsync({ id: ticket.id, status: tempStatus as any });
        toast.success(direction === 'rtl' ? 'تم تحديث الحالة' : 'Status updated');
      }
      onClose();
    } catch (error) {
      toast.error(direction === 'rtl' ? 'فشل التحديث' : 'Update failed');
    }
  };

  const executeStatusChange = async (status: string) => {
    try {
      await updateTicket.mutateAsync({ id: ticket.id, status: status as any });
      toast.success(direction === 'rtl' ? 'تم تحديث الحالة' : 'Status updated');
      if (status === 'closed' || status === 'resolved') {
        onClose();
      }
    } catch (error) {
      toast.error(direction === 'rtl' ? 'فشل التحديث' : 'Update failed');
    }
  };

  const requestStatusChange = (status: string) => {
    if (status === 'closed') {
      if (isSupportAgent) {
        setPendingStatus('pending_closure');
      } else {
        setPendingStatus('closed');
      }
      return;
    }
    void executeStatusChange(status);
  };

  const confirmClose = async () => {
    const status = pendingStatus;
    setPendingStatus(null);
    if (!status) return;
    await executeStatusChange(status);
  };

  const timeLocale = direction === 'rtl' ? ar : enUS;
  const createdTimeText = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: timeLocale });
  const resolvedTimeText = ticket.resolved_at
    ? formatDistanceToNow(new Date(ticket.resolved_at), { addSuffix: true, locale: timeLocale })
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {ticket.title}
                  <Badge
                    variant={
                      ticket.status === 'open'
                        ? 'destructive'
                        : ticket.status === 'resolved' || ticket.status === 'closed'
                          ? 'default'
                          : 'secondary'
                    }
                    className="capitalize"
                  >
                    {ticket.status === 'open'
                      ? direction === 'rtl'
                        ? 'مفتوحة'
                        : 'Open'
                      : ticket.status === 'in_progress'
                        ? direction === 'rtl'
                          ? 'قيد التنفيذ'
                          : 'In Progress'
                        : ticket.status === 'resolved'
                          ? direction === 'rtl'
                            ? 'محلولة'
                            : 'Resolved'
                          : ticket.status === 'pending_closure'
                            ? direction === 'rtl'
                              ? 'بانتظار الإغلاق'
                              : 'Pending Closure'
                            : ticket.status === 'closed'
                              ? direction === 'rtl'
                                ? 'مغلقة'
                                : 'Closed'
                              : String(ticket.status).replace('_', ' ')}
                  </Badge>
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" /> {ticket.creator?.full_name || 'User'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {createdTimeText}
                  </span>
                  {ticket.screen_name && (
                    <Badge variant="outline">
                      {direction === 'rtl' ? 'الشاشة:' : 'Screen:'} {ticket.screen_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Description */}
            <div className="bg-muted/30 p-4 rounded-lg border whitespace-pre-wrap text-sm">{ticket.description}</div>

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {direction === 'rtl' ? 'المرفقات' : 'Attachments'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setFullscreenImage(url)}
                      className="cursor-pointer block w-24 h-24 rounded-md overflow-hidden border hover:opacity-80 transition-opacity"
                    >
                      <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Info */}
            {(ticket.status === 'closed' || ticket.status === 'resolved') && ticket.resolver && (
              <div className="bg-score-excellent/10 border-score-excellent/20 border p-3 rounded-lg flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-score-excellent" />
                <span>
                  {direction === 'rtl' ? 'تم الحل بواسطة: ' : 'Resolved by: '}
                  <strong>{ticket.resolver.full_name}</strong>
                  {resolvedTimeText && <span className="text-muted-foreground ms-2">({resolvedTimeText})</span>}
                </span>
              </div>
            )}

            {/* Comments Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">{direction === 'rtl' ? 'التعليقات' : 'Comments'}</h3>

              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : comments?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg bg-muted/10">
                  {direction === 'rtl' ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                </p>
              ) : (
                <div className="space-y-3">
                  {comments?.map((c: any) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg border text-sm ${
                        c.user_id === ticket.created_by ? 'bg-background ml-8' : 'bg-primary/5 mr-8'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-medium text-primary">{c.user?.full_name || 'User'}</span>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: timeLocale })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t bg-muted/10">
            {ticket.status !== 'closed' && ticket.status !== 'resolved' ? (
              <div className="flex flex-col gap-3">
                {!commentPosted ? (
                  // Step 1: Comment Input with Post Button
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={direction === 'rtl' ? 'اكتب تعليقاً...' : 'Write a comment...'}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <Button
                      onClick={handlePostComment}
                      disabled={addComment.isPending || !newComment.trim()}
                      className="h-auto shrink-0 px-6"
                    >
                      <Send className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180 ml-2' : 'mr-2'}`} />
                      {direction === 'rtl' ? 'نشر' : 'Post'}
                    </Button>
                  </div>
                ) : (
                  // Step 2: Status Change with Final Submit
                  <div className="space-y-3">
                    <div className="p-3 bg-score-excellent/10 border border-score-excellent/20 rounded-lg">
                      <p className="text-sm text-score-excellent font-medium">
                        {direction === 'rtl' ? '✓ تم نشر التعليق بنجاح' : '✓ Comment posted successfully'}
                      </p>
                    </div>
                    
                    {isSupportAgent && (
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">{direction === 'rtl' ? 'تحديث حالة التذكرة:' : 'Update ticket status:'}</span>
                        <Select value={tempStatus} onValueChange={setTempStatus}>
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        onClick={() => setCommentPosted(false)}
                        size="sm"
                      >
                        {direction === 'rtl' ? 'إضافة تعليق آخر' : 'Add Another Comment'}
                      </Button>
                      
                      <Button onClick={handleFinalSubmit} className="px-8">
                        <Send className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180 ml-2' : 'mr-2'}`} />
                        {direction === 'rtl' ? 'إرسال وإغلاق' : 'Submit & Close'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Original Status Controls - Show only if comment not posted */}
                {!commentPosted && (
                  <div className="flex justify-between items-center mt-2">
                    {!isSupportAgent && ticket.status === 'pending_closure' ? (
                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="text-sm font-medium flex-1 text-center sm:text-start">
                          {direction === 'rtl' 
                            ? 'يطلب الدعم الفني إغلاق هذه التذكرة. هل توافق على الإغلاق؟' 
                            : 'Support requested to close this ticket. Do you approve?'}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => executeStatusChange('closed')} className="bg-score-excellent hover:bg-score-excellent/90">
                            {direction === 'rtl' ? 'موافقة وإغلاق' : 'Accept & Close'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => executeStatusChange('open')}>
                            {direction === 'rtl' ? 'رفض وإعادة فتح' : 'Reject & Reopen'}
                          </Button>
                        </div>
                      </div>
                    ) : isSupportAgent ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{direction === 'rtl' ? 'تحديث الحالة:' : 'Update Status:'}</span>
                        <Select value={ticket.status} onValueChange={requestStatusChange}>
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            {ticket.status === 'pending_closure' && (
                              <SelectItem value="pending_closure">
                                {direction === 'rtl' ? 'بانتظار الإغلاق' : 'Pending Closure'}
                              </SelectItem>
                            )}
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestStatusChange('closed')}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        {direction === 'rtl' ? 'إغلاق التذكرة' : 'Close Ticket'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-center text-muted-foreground">
                {direction === 'rtl'
                  ? 'هذه التذكرة مغلقة. لا يمكن إضافة تعليقات.'
                  : 'This ticket is closed. No new comments can be added.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Close confirmation */}
      <AlertDialog open={isCloseConfirmOpen} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{closeConfirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{closeConfirmCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{closeConfirmCopy.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>{closeConfirmCopy.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Image Modal */}
      <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-0 bg-transparent shadow-none [&>button]:hidden flex items-center justify-center">
          <div className="relative flex flex-col items-center justify-center w-full h-full max-h-[90vh]">
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-4 -right-4 z-50 rounded-full h-10 w-10 shadow-lg border bg-background hover:bg-muted"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="w-5 h-5" />
            </Button>
            {fullscreenImage && (
              <img
                src={fullscreenImage}
                alt="Fullscreen"
                className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

