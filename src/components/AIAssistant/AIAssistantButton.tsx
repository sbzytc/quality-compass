import { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistantChat } from './AIAssistantChat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import aiAssistantIcon from '@/assets/ai-assistant-icon.png';

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { direction } = useLanguage();
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className={cn(
          "fixed bottom-6 z-50",
          direction === 'rtl' ? 'left-6' : 'right-6'
        )}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        )}
        <div className={cn(
          "relative rounded-full transition-shadow duration-300",
          !isOpen && "shadow-[0_0_25px_8px_hsl(var(--primary)/0.35),0_0_50px_15px_hsl(var(--primary)/0.15)]"
        )}>
          <Button
            onClick={() => setIsOpen(!isOpen)}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg relative overflow-hidden",
              isOpen
                ? "bg-muted text-foreground hover:bg-muted"
                : "bg-primary/10 border-2 border-primary/30 hover:bg-primary/20"
            )}
          >
            {isOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <img src={aiAssistantIcon} alt="AI Assistant" className="w-9 h-9 object-contain" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-24 z-50 w-[400px] max-w-[calc(100vw-2rem)] rounded-xl border shadow-2xl overflow-hidden bg-background",
              direction === 'rtl' ? 'left-6' : 'right-6'
            )}
          >
            {/* Expand to full page */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2.5 end-12 h-7 w-7 z-10"
              onClick={() => {
                setIsOpen(false);
                navigate('/assistant');
              }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <AIAssistantChat />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
