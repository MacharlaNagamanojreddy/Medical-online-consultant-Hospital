import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { externalSupabase } from '@/integrations/external-supabase/client';
import { callAgent, type ConversationMessage, type PatientContext } from '@/services/aiAgent';
import { Send, Brain, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PatientData {
  id: string;
  full_name: string;
  date_of_birth: string;
  blood_type: string;
  allergies: string[];
  chronic_conditions: string[];
  insurance_provider: string;
}

const quickChips = [
  { emoji: '📅', label: 'Book Appointment', message: 'I would like to book a new appointment. What doctors and time slots are available?' },
  { emoji: '💊', label: 'My Medications', message: 'Can you tell me about my current medications, their dosages, and any important instructions?' },
  { emoji: '🔍', label: 'Check Symptoms', message: 'I want to check some symptoms I\'ve been experiencing. Can you help me understand what might be going on?' },
  { emoji: '📋', label: 'Lab Results', message: 'Can you help me understand my recent lab results and what they mean?' },
];

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const TypingIndicator = () => (
  <div className="flex items-end gap-3 max-w-[80%]">
    <div className="shrink-0 w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
      <Brain size={16} className="text-teal-400" />
    </div>
    <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-[#0C0F1A] border border-[#1A1F35]">
      <div className="flex gap-1.5 items-center h-5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  </div>
);

const TriageBadge = ({ content }: { content: string }) => {
  if (content.includes('[TRIAGE: EMERGENCY]')) {
    return (
      <Badge className="mb-2 bg-red-500/20 text-red-500 border-red-500/30 flex items-center gap-1.5 w-fit">
        <AlertTriangle size={12} /> Emergency: Seek Immediate Care
      </Badge>
    );
  }
  if (content.includes('[TRIAGE: URGENT]')) {
    return (
      <Badge className="mb-2 bg-orange-500/20 text-orange-500 border-orange-500/30 flex items-center gap-1.5 w-fit">
        <AlertTriangle size={12} /> Urgent: Contact Doctor Soon
      </Badge>
    );
  }
  if (content.includes('[TRIAGE: ROUTINE]')) {
    return (
      <Badge className="mb-2 bg-teal-500/20 text-teal-400 border-teal-500/30 flex items-center gap-1.5 w-fit">
        Routine: Monitor & Schedule Follow-up
      </Badge>
    );
  }
  return null;
};

const PatientChat = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [patientContext, setPatientContext] = useState<PatientContext | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load patient data and build context
  useEffect(() => {
    if (!user) return;

    const loadContext = async () => {
      const { data: patient } = await externalSupabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!patient) return;
      setPatientData(patient);

      // Fetch active medications and upcoming appointments in parallel
      const [medsRes, apptsRes] = await Promise.all([
        externalSupabase
          .from('medications')
          .select('medication_name, dosage, frequency')
          .eq('patient_id', patient.id)
          .eq('is_active', true),
        externalSupabase
          .from('appointments')
          .select('appointment_date, appointment_time, doctor:doctors(full_name)')
          .eq('patient_id', patient.id)
          .in('status', ['scheduled', 'confirmed'])
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .order('appointment_date', { ascending: true })
          .limit(3),
      ]);

      const ctx: PatientContext = {
        user_id: user.id,
        name: patient.full_name,
        age: patient.date_of_birth ? calculateAge(patient.date_of_birth) : undefined,
        blood_type: patient.blood_type,
        allergies: patient.allergies || [],
        chronic_conditions: patient.chronic_conditions || [],
        active_medications: (medsRes.data || []).map((m: any) => `${m.medication_name} ${m.dosage} (${m.frequency})`),
        upcoming_appointments: (apptsRes.data || []).map((a: any) => {
          const doc = Array.isArray(a.doctor) ? a.doctor[0] : a.doctor;
          return `${a.appointment_date} at ${a.appointment_time} with Dr. ${doc?.full_name || 'Unknown'}`;
        }),
        insurance: patient.insurance_provider,
      };
      setPatientContext(ctx);

      // Welcome message
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: `Hello ${patient.full_name}! 👋 I'm your MedFlow AI health assistant. I can help you with appointments, medications, symptoms, or any health questions. How can I help you today?`,
        timestamp: new Date(),
      }]);
    };

    loadContext();
  }, [user]);

  // Handle auto-prompt from URL
  useEffect(() => {
    const promptValue = searchParams.get('prompt');
    if (promptValue === 'symptom-check' && patientContext && messages.length === 1) {
      sendMessage("I want to check some symptoms I've been experiencing. Can you help me understand what might be going on?");
    }
  }, [searchParams, patientContext, messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history (exclude welcome message for cleaner context)
      const history: ConversationMessage[] = messages
        .slice(1) // skip welcome
        .map(m => ({ role: m.role, content: m.content }));

      const res = await callAgent({
        agent_type: 'patient_agent',
        message: text.trim(),
        patient_context: patientContext,
        conversation_history: history,
        user_id: user.id,
      });

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'I\'m sorry, I encountered an error. Please try again in a moment.',
        timestamp: new Date(),
      }]);
      console.error('Chat error:', err);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [messages, isTyping, patientContext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#060810' }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-end gap-3 max-w-[80%]">
                <div className="shrink-0 w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Brain size={16} className="text-teal-400" />
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-[#0C0F1A] border border-[#1A1F35] text-sm text-gray-200">
                  <TriageBadge content={msg.content} />
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                    <ReactMarkdown>
                      {msg.content.replace(/\[TRIAGE: (EMERGENCY|URGENT|ROUTINE)\]/g, '')}
                    </ReactMarkdown>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}

            {msg.role === 'user' && (
              <div className="max-w-[80%]">
                <div className="rounded-2xl rounded-br-md px-4 py-3 bg-teal-600/20 border border-teal-500/20 text-sm text-gray-200">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] text-gray-500 mt-2 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick action chips */}
      <div className="px-4 pb-2 flex flex-wrap gap-2">
        {quickChips.map(chip => (
          <button
            key={chip.label}
            onClick={() => sendMessage(chip.message)}
            disabled={isTyping}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0C0F1A] border border-[#1A1F35] text-xs text-gray-400 hover:text-teal-400 hover:border-teal-500/30 transition-colors disabled:opacity-50"
          >
            <span>{chip.emoji}</span> {chip.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="px-4 pb-4 pt-2"
      >
        <div className="flex items-center gap-2 rounded-xl bg-[#0C0F1A] border border-[#1A1F35] px-4 py-2 focus-within:border-teal-500/40 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isTyping}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="shrink-0 w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-30"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientChat;
