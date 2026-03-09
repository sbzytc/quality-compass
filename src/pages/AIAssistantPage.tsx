import { AIAssistantChat } from '@/components/AIAssistant/AIAssistantChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldX } from 'lucide-react';

export default function AIAssistantPage() {
  const { direction } = useLanguage();
  const { profile } = useAuth();

  if (!profile?.ai_assistant_enabled) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">
          {direction === 'rtl' ? 'غير مصرح' : 'Access Denied'}
        </h2>
        <p className="text-muted-foreground">
          {direction === 'rtl'
            ? 'ليس لديك صلاحية استخدام المساعد الذكي. تواصل مع مسؤول النظام لتفعيلها.'
            : 'You do not have permission to use the AI Assistant. Contact your admin to enable it.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {direction === 'rtl' ? 'المساعد الذكي' : 'AI Assistant'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {direction === 'rtl'
            ? 'اسأل أي سؤال أو اطلب تنفيذ مهمة - المساعد يتعامل مع بياناتك الحقيقية'
            : 'Ask questions or request tasks - the assistant works with your real data'}
        </p>
      </div>
      <div className="border rounded-xl overflow-hidden shadow-sm">
        <AIAssistantChat fullPage />
      </div>
    </div>
  );
}
