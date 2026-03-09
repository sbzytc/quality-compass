import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import aiAssistantIcon from '@/assets/ai-assistant-icon.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIAssistantChatProps {
  fullPage?: boolean;
}

export function AIAssistantChat({ fullPage = false }: AIAssistantChatProps) {
  const { messages, setMessages, clearMessages } = useAIAssistant();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { direction } = useLanguage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: 'user' as const, content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: newMessages },
      });

      if (error) {
        // Check for specific error codes
        if (error.message?.includes('403') || (error as any)?.status === 403) {
          toast.error(direction === 'rtl' ? 'ليس لديك صلاحية استخدام المساعد الذكي' : 'You do not have permission to use the AI Assistant');
        } else if (error.message?.includes('429') || (error as any)?.status === 429) {
          toast.error('تم تجاوز حد الطلبات، حاول بعد قليل');
        } else if (error.message?.includes('402') || (error as any)?.status === 402) {
          toast.error('الرصيد غير كافٍ، يرجى إضافة رصيد');
        } else {
          toast.error('حدث خطأ، حاول مرة أخرى');
        }
        console.error('AI assistant error:', error);
        return;
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data?.content || 'عذراً، لم أتمكن من معالجة طلبك.',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI assistant error:', err);
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestions = [
    'كم عدد الملاحظات المفتوحة؟',
    'أعطني ملخص أداء الفروع',
    'أنشئ مهمة جديدة',
    'ما هي أبرز التوصيات؟',
  ];

  return (
    <div className={cn(
      "flex flex-col bg-background",
      fullPage ? "h-[calc(100vh-8rem)]" : "h-[500px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            <img src={aiAssistantIcon} alt="" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{direction === 'rtl' ? 'مساعد رصدة الذكي' : 'Rasdah AI Assistant'}</h3>
            <p className="text-xs text-muted-foreground">
              {direction === 'rtl' ? 'أسألني أو اطلب مني تنفيذ أي مهمة' : 'Ask me or request any task'}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-semibold text-lg mb-2">
              {direction === 'rtl' ? 'مرحباً! كيف أقدر أساعدك؟' : 'Hi! How can I help?'}
            </h4>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
              {direction === 'rtl'
                ? 'أقدر أعرض لك التقييمات، أدير المهام، أحلل الملاحظات، وأقدم توصيات'
                : 'I can view evaluations, manage tasks, analyze findings, and provide recommendations'}
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="text-xs text-start p-2.5 rounded-lg border bg-card hover:bg-accent/10 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2.5',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  msg.role === 'user' ? 'bg-primary' : 'bg-accent'
                )}>
                  {msg.role === 'user' 
                    ? <User className="w-3.5 h-3.5 text-primary-foreground" />
                    : <Bot className="w-3.5 h-3.5 text-accent-foreground" />
                  }
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}>
                  <div dir="auto" className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-accent-foreground" />
                </div>
                <div className="bg-muted rounded-xl px-3.5 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={direction === 'rtl' ? 'اكتب رسالتك...' : 'Type your message...'}
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0"
          >
            <Send className={cn("w-4 h-4", direction === 'rtl' && 'rotate-180')} />
          </Button>
        </div>
      </div>
    </div>
  );
}
