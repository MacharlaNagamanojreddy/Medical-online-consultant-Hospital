import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { callAgent } from '@/services/aiAgent';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const FamilyChat = () => {
  const { db_id } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db_id) return;

    const fetchChatHistory = async () => {
      setLoading(true);
      try {
        const { data } = await (externalSupabase as any)
          .from('chat_history')
          .select('*')
          .eq('user_id', db_id)
          .order('created_at', { ascending: true })
          .limit(20);

        if (data && data.length > 0) {
          const history: Message[] = [];
          data.forEach((entry: any) => {
            history.push({
              id: `${entry.id}-user`,
              text: entry.message,
              sender: 'user',
              timestamp: new Date(entry.created_at)
            });
            if (entry.response) {
              history.push({
                id: `${entry.id}-ai`,
                text: entry.response,
                sender: 'ai',
                timestamp: new Date(entry.created_at)
              });
            }
          });
          setMessages(history);
        } else {
          // Welcome message
          setMessages([
            {
              id: 'welcome',
              text: "Hello! I'm your MedFlow Family Assistant. I can help you understand care plans, appointment details, or answer general health questions about your linked family members.",
              sender: 'ai',
              timestamp: new Date()
            }
          ]);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, [db_id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Build history from existing messages
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: m.text
        }));

      const res = await callAgent({
        agent_type: 'family_agent',
        user_message: userMessage.text,
        conversation_history: history,
        user_id: db_id || undefined,
      });

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: res.reply,
        sender: 'ai',
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Error in AI chat:', err);
      setMessages(prev => [...prev, {
        id: 'error' + Date.now(),
        text: 'I am sorry, I encountered an error. Please try again later.',
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 h-[80vh] flex flex-col gap-4">
        <Skeleton className="h-10 w-48 bg-[#1A1F35] mb-4" />
        <Skeleton className="h-full w-full rounded-2xl bg-[#1A1F35]" />
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-100px)] flex flex-col" style={{ background: '#060810' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2 font-display">
            <Sparkles className="text-teal-400" size={24} /> Care AI Assistant
          </h1>
          <p className="text-gray-400 text-sm">Real-time health guidance and record clarification</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold tracking-widest uppercase">
            Level 4 Encryption
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col rounded-2xl border border-[#1A1F35] bg-[#0C0F1A] shadow-2xl relative">
        {/* Messages Container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.sender === 'ai' ? 'bg-teal-500/20 text-teal-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {msg.sender === 'ai' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={`max-w-[80%] md:max-w-[60%] p-4 rounded-2xl text-sm leading-relaxed ${msg.sender === 'ai' ? 'bg-[#1A1F35]/50 text-gray-200 border border-[#1A1F35]' : 'bg-teal-600 text-white shadow-lg shadow-teal-500/10'}`}>
                {msg.text}
                <div className={`text-[10px] mt-2 ${msg.sender === 'ai' ? 'text-gray-500' : 'text-teal-200'}`}>
                  {format(msg.timestamp, 'h:mm a')}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="bg-[#1A1F35]/50 border border-[#1A1F35] p-4 rounded-2xl flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-teal-500" />
                <span className="text-xs text-gray-500 italic">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="p-4 bg-[#0C0F1A] border-t border-[#1A1F35] space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Vitals Summary', 'Medication List', 'Doctor Notes'].map((label) => (
              <button key={label} className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-[#1A1F35] text-[10px] text-gray-400 hover:text-white border border-transparent hover:border-teal-500/30 transition-all font-bold tracking-tight">
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your question here..."
              className="flex-1 bg-[#1A1F35]/30 border border-[#1A1F35] rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 rounded-xl bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-teal-500/20"
            >
              <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyChat;
