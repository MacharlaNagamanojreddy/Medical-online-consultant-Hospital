import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { FileText, Clipboard, Search, Thermometer, Heart, Activity, Wind, Eye, Calendar, Clock, Brain, Loader2, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { callAgent } from '@/services/aiAgent';
import PatientBriefingCard from '@/components/doctor/PatientBriefingCard';
import ClinicalOrderPanel from '@/components/doctor/ClinicalOrderPanel';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SoapNote {
  id: string;
  created_at: string;
  record_type: string;
  vitals: {
    temp: string;
    blood_pressure: string;
    heart_rate: string;
    oxygen_level: string;
  } | null;
  content: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  } | null;
  patient_id?: string;
  patient: {
    user: {
      full_name: string;
    } | null;
  } | null;
}

const DoctorSoapNotes = () => {
  const { db_id, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [notes, setNotes] = useState<SoapNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(!!patientId);
  const [aiLoading, setAiLoading] = useState(false);

  // Form State
  const [rawNotes, setRawNotes] = useState('');
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  useEffect(() => {
    if (!db_id) return;

    const fetchNotes = async () => {
      setLoading(true);
      try {
        const { data: doctorData } = await (externalSupabase as any)
          .from('doctors')
          .select('id')
          .eq('user_id', db_id)
          .maybeSingle();

        if (doctorData) {
          const { data, error } = await (externalSupabase as any)
            .from('medical_records')
            .select(`
              id,
              created_at,
              record_type,
              vitals,
              content,
              patient_id,
              patient:patient_id (
                user:user_id (full_name)
              )
            `)
            .eq('doctor_id', doctorData.id)
            .order('created_at', { ascending: false });

          if (error) console.error('Error fetching SOAP notes:', error);
          if (data) setNotes(data as any);
        }
      } catch (err) {
        console.error('Error in fetchNotes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [db_id]);

  const handleAiGenerate = async () => {
    if (!rawNotes.trim()) {
      toast.error('Please enter some clinical observations first.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await callAgent({
        agent_type: 'doctor_agent',
        message: `Format these raw clinical notes into a structured SOAP note: ${rawNotes}`
      });

      // Simple parsing of AI response (expected Subjective:, Objective:, etc.)
      const reply = res.reply;
      const subjective = reply.match(/Subjective:(.*?)(?=Objective:|$)/si)?.[1]?.trim() || '';
      const objective = reply.match(/Objective:(.*?)(?=Assessment:|$)/si)?.[1]?.trim() || '';
      const assessment = reply.match(/Assessment:(.*?)(?=Plan:|$)/si)?.[1]?.trim() || '';
      const plan = reply.match(/Plan:(.*?)$/si)?.[1]?.trim() || '';

      setSoapData({ subjective, objective, assessment, plan });
      toast.success('SOAP note generated successfully!');
    } catch (err) {
      toast.error('AI generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveRecord = async () => {
    if (!patientId || !soapData.assessment) {
      toast.error('Please ensure patient is selected and assessment is filled.');
      return;
    }

    try {
      const { data: docData } = await (externalSupabase as any)
        .from('doctors')
        .select('id')
        .eq('user_id', db_id)
        .maybeSingle();

      const { error } = await (externalSupabase as any)
        .from('medical_records')
        .insert({
          patient_id: patientId,
          doctor_id: docData.id,
          record_type: 'Consultation',
          content: soapData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // CROSS-AGENT NOTIFICATION TRIGGER
      await (externalSupabase as any)
        .from('notifications')
        .insert({
          recipient_id: patientId,
          title: 'New Clinical Record',
          message: `Dr. ${profile?.full_name || 'Your doctor'} has updated your medical records following the recent consultation.`,
          type: 'result',
          is_read: false
        });

      toast.success('Medical record saved and patient notified!');
      setIsComposing(false);
      // Refresh list
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save record');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl bg-[#1A1F35]" />)}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 min-h-screen animate-fade-in" style={{ background: '#04060c' }}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-display">
            Clinical <span className="text-gradient">Records</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Precision documentation with AI clinical decision support</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComposing(!isComposing)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isComposing
              ? "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
              : "bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white shadow-lg shadow-teal-500/20"
              }`}
          >
            {isComposing ? 'Close Composer' : 'New SOAP Note'}
          </button>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
            <input
              className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-teal-500/50 w-full md:w-64 transition-all"
              placeholder="Search clinical history..."
            />
          </div>
        </div>
      </div>

      {isComposing && (
        <div className="space-y-10 animate-slide-up">
          {/* Top Section: AI Intelligence (Full Width) */}
          <section>
            {patientId ? (
              <PatientBriefingCard patientId={patientId} />
            ) : (
              <div className="glass-card p-10 text-center border-dashed border-white/10">
                <Brain className="mx-auto text-gray-700 mb-4 opacity-20" size={48} />
                <p className="text-gray-500 text-sm">Select a patient from the dashboard to activate clinical intelligence.</p>
              </div>
            )}
          </section>

          {/* Middle Section: Documentation & Orders */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* AI SOAP Section */}
            <div className="glass-card p-8 border-teal-500/10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
                    <Clipboard size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">AI SOAP Generator</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="border-teal-500/20 text-teal-400 hover:bg-teal-500/10 rounded-lg px-4"
                >
                  {aiLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Brain className="mr-2" size={16} />}
                  Format Structured Note
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase text-gray-500 font-bold ml-1 block tracking-widest">Raw Clinical Observations</label>
                    <div className="flex gap-2">
                      {[
                        { label: 'Routine', text: 'Patient presents for yearly physical. Vitals stable. No new complaints. Reviewing current medications and screening schedule.' },
                        { label: 'Emergency', text: 'Patient brought to ER with acute onset of symptoms. Vitals show tachycardia. Initial assessment reveals acute distress. Immediate intervention ordered.' },
                        { label: 'Post-Op', text: 'Post-operative day 3 following procedure. Wound site clean and intact. Pain managed with current regimen. Mobility meeting protocol targets.' }
                      ].map(tmp => (
                        <button
                          key={tmp.label}
                          onClick={() => setRawNotes(tmp.text)}
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-white/5 border border-white/5 hover:border-teal-500/30 text-gray-500 hover:text-teal-400 transition-all"
                        >
                          {tmp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    placeholder="Type or paste consultation transcript, vitals, and findings here..."
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    className="w-full h-40 bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/40 transition-all resize-none shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="text-[10px] uppercase text-teal-500/70 font-bold ml-1 tracking-widest">{field}</label>
                      <textarea
                        value={soapData[field]}
                        onChange={(e) => setSoapData({ ...soapData, [field]: e.target.value })}
                        className="w-full h-32 bg-[#0C0F1A] border border-white/5 rounded-xl p-4 text-sm text-gray-300 focus:outline-none focus:border-teal-500/40 transition-all hover:border-white/10"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleSaveRecord}
                    className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-xl px-12 py-6 text-md font-bold shadow-xl shadow-teal-500/10 transition-all active:scale-95"
                  >
                    Finalize & Save Record
                  </Button>
                </div>
              </div>
            </div>

            {/* Orders Section */}
            <div className="space-y-10">
              <ClinicalOrderPanel
                patientId={patientId || ''}
                onSave={(orders) => {
                  const ordersSummary = orders.map(o => `• ${o.type}: ${o.name} (${o.details})`).join('\n');
                  setSoapData(prev => ({
                    ...prev,
                    plan: prev.plan + (prev.plan ? '\n\n' : '') + 'ORDERS PENDING:\n' + ordersSummary
                  }));
                }}
              />

              <div className="glass-card p-8 bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="text-purple-400" size={20} />
                  <h4 className="text-lg font-bold text-white tracking-tight">Clinical Decision Support</h4>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">
                  AI is monitoring current observations against hospital protocols.
                  <span className="text-purple-400/80 block mt-2 font-medium">Tip: Structured SOAP notes increase billing accuracy and clinical follow-up precision.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-10 border-t border-white/5">
        <h2 className="text-2xl font-bold text-white mb-8 tracking-tight font-display">Clinical History</h2>
        <div className="grid grid-cols-1 gap-8">
          {notes.length === 0 ? (
            <div className="glass-card p-20 text-center border-dashed border-white/10">
              <FileText className="mx-auto text-gray-700 mb-4 opacity-20" size={64} />
              <p className="text-gray-500 font-medium tracking-wide">No clinical history records found for this doctor.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="glass-card p-8 group flex flex-col gap-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20 shadow-inner group-hover:scale-110 transition-transform">
                      <Clipboard size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Visit with {note.patient?.user?.full_name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                          <Calendar size={12} className="text-teal-500/70" /> {format(new Date(note.created_at), 'MMMM d, yyyy')}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                          <Clock size={12} className="text-teal-500/70" /> {format(new Date(note.created_at), 'p')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 text-teal-400 border-teal-500/20 px-4 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full shadow-sm">
                    {note.record_type || 'Consultation'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { icon: Thermometer, color: 'text-orange-400', label: 'Temperature', val: `${note.vitals?.temp || '98.6'}°F` },
                    { icon: Heart, color: 'text-red-400', label: 'Heart Rate', val: `${note.vitals?.heart_rate || '72'} BPM` },
                    { icon: Activity, color: 'text-blue-400', label: 'Blood Pressure', val: note.vitals?.blood_pressure || '120/80' },
                    { icon: Wind, color: 'text-cyan-400', label: 'Oxygen Sat', val: `${note.vitals?.oxygen_level || '98'}%` }
                  ].map((v, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-white/10 transition-colors">
                      <v.icon size={18} className={v.color} />
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase font-bold tracking-tight">{v.label}</p>
                        <p className="text-md font-bold text-white">{v.val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                  <div className="space-y-8">
                    <div className="relative pl-6 border-l-2 border-teal-500/20 hover:border-teal-500 transition-colors">
                      <h4 className="text-[10px] font-bold text-teal-400 uppercase mb-3 tracking-widest pl-1">Subjective Observations</h4>
                      <p className="text-sm text-gray-400 leading-relaxed italic">"{note.content?.subjective || 'No subjective observations recorded.'}"</p>
                    </div>
                    <div className="relative pl-6 border-l-2 border-teal-500/20 hover:border-teal-500 transition-colors">
                      <h4 className="text-[10px] font-bold text-teal-400 uppercase mb-3 tracking-widest pl-1">Objective Findings</h4>
                      <p className="text-sm text-gray-400 leading-relaxed italic">"{note.content?.objective || 'No objective findings recorded.'}"</p>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="relative pl-6 border-l-2 border-teal-500/20 hover:border-teal-500 transition-colors">
                      <h4 className="text-[10px] font-bold text-teal-400 uppercase mb-3 tracking-widest pl-1">Clinical Assessment</h4>
                      <div className="bg-teal-500/5 rounded-2xl p-5 border border-teal-500/10 shadow-inner">
                        <p className="text-sm font-bold text-white leading-relaxed">{note.content?.assessment || 'Initial clinical assessment.'}</p>
                      </div>
                    </div>
                    <div className="relative pl-6 border-l-2 border-teal-500/20 hover:border-teal-500 transition-colors">
                      <h4 className="text-[10px] font-bold text-teal-400 uppercase mb-3 tracking-widest pl-1">Treatment Plan</h4>
                      <p className="text-sm text-gray-400 leading-relaxed italic">"{note.content?.plan || 'Follow standard treatment care plan.'}"</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorSoapNotes;
