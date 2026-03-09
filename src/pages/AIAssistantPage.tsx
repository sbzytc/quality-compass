import { AIAssistantChat } from '@/components/AIAssistant/AIAssistantChat';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AIAssistantPage() {
  const { direction } = useLanguage();

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
