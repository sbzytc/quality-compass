import { createContext, useContext, useState, ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  clearMessages: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const clearMessages = () => setMessages([]);

  return (
    <AIAssistantContext.Provider value={{ messages, setMessages, clearMessages }}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error('useAIAssistant must be used within AIAssistantProvider');
  return ctx;
}
