import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Heart, Calendar, Pill, User, ShieldCheck, Activity, Clock, FileText, ChevronRight, MessageSquare, Sparkles, BrainCircuit, RefreshCw } from 'lucide-react';
import { callAgent } from '@/services/aiAgent';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface FamilyMember {
  patient_id: string;
  relationship: string;
  can_view_records: boolean;
  can_view_medications: boolean;
}

interface Patient {
  id: string;
  full_name: string;
  blood_type: string;
  allergies: string[];
}

const cardStyle = "rounded-2xl border p-6 bg-[#0C0F1A] border-[#1A1F35]";

const FamilyDashboard = () => {
  const { db_id } = useAuth();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!db_id) {
      setLoading(false);
      return;
    }

    const fetchFamilyData = async () => {
      setLoading(true);
      try {
        // 1. Get family member link
        const { data: memberData } = await (externalSupabase as any)
          .from('family_members')
          .select('*')
          .eq('user_id', db_id)
          .maybeSingle();

        if (memberData) {
          setMember(memberData);

          // 2. Get the linked patient's basic info
          const { data: patientUser } = await (externalSupabase as any)
            .from('patients')
            .select('id, user:user_id(full_name), blood_type, allergies')
            .eq('id', memberData.patient_id)
            .maybeSingle();

          if (patientUser) {
            setPatient({
              id: patientUser.id,
              full_name: patientUser.user?.full_name || 'Relative',
              blood_type: patientUser.blood_type,
              allergies: patientUser.allergies || [],
            });

            // 3. Parallel fetch of health data if authorized
            const fetches = [];

            // Always show appointments for family
            fetches.push(
              (externalSupabase as any)
                .from('appointments')
                .select('id, scheduled_date, scheduled_time, status, doctor:doctor_id(id)')
                .eq('patient_id', patientUser.id)
                .order('scheduled_date', { ascending: true })
                .limit(3)
            );

            if (memberData.can_view_medications) {
              fetches.push(
                (externalSupabase as any)
                  .from('medications')
                  .select('*')
                  .eq('patient_id', patientUser.id)
                  .eq('is_active', true)
              );
            }

            const responses = await Promise.all(fetches);
            setAppointments(responses[0].data || []);
            if (responses[1]) setMedications(responses[1].data || []);
          }
        }
      } catch (err) {
        console.error('Error fetching family dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyData();
  }, [db_id]);

  const handleGenerateSummary = async () => {
    if (!patient || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await callAgent({
        agent_type: 'family_agent',
        user_message: `Provide a friendly, plain-English 3-sentence summary of the patient's current health status based on: Stable vitals, physical therapy progress, and no new complications. Focus on reassurance.`,
        patient_context: {
          name: patient.full_name,
          blood_type: patient.blood_type,
          allergies: patient.allergies,
        }
      });
      setAiSummary(res.reply);
    } catch (err) {
      console.error('AI Summary generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
        <Skeleton className="h-40 w-full rounded-2xl bg-[#1A1F35]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl bg-[#1A1F35]" />
          <Skeleton className="h-64 rounded-2xl bg-[#1A1F35]" />
        </div>
      </div>
    );
  }

  if (!member || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 space-y-4 text-center px-4">
        <ShieldCheck size={48} className="text-gray-600 mb-2" />
        <p className="max-w-xs text-lg font-medium text-white">No active patient linkage found.</p>
        <p className="text-sm opacity-60">To view health data, you must be registered as a family guardian for a patient in our system.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fade-in" style={{ background: '#04060c', minHeight: '100%' }}>
      {/* Patient Header Card */}
      <div className="glass-card p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl -mr-40 -mt-40 transition-colors group-hover:bg-teal-500/10" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center text-teal-400 border border-teal-500/20 shadow-xl group-hover:scale-110 transition-all group-hover:rotate-3">
            <User size={48} />
          </div>
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="text-3xl md:text-5xl font-bold text-white font-display tracking-tight">
                Monitoring: <span className="text-gradient">{patient.full_name}</span>
              </h1>
              <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full">
                {member.relationship}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm font-medium text-gray-500">
              <span className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Activity size={16} className="text-emerald-400" /> Vitals: Stable
              </span>
              <span className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Heart size={16} className="text-red-400" /> Blood Type: {patient.blood_type}
              </span>
              <span className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <ShieldCheck size={16} className="text-teal-400" /> Authorized Guardian
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-slide-up">
        {/* Health Status Updates - New Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Health Status Update</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Updated {format(new Date(), 'h:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/20 transition-all disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isGenerating ? "Synthesizing..." : "AI Synthesis"}
                </button>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">Current: Stable</Badge>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative">
                {aiSummary && (
                  <div className="mb-6 p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2">
                      <BrainCircuit size={14} className="text-teal-400" />
                      <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">AI Synthesis Result</span>
                    </div>
                    <p className="text-sm text-white font-medium italic leading-relaxed">
                      {aiSummary}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                  "Patient is responding well to current treatment plan. Vital signs are within normal parameters.
                  Physical therapy session completed this morning with improved mobility noted in upper limbs."
                </p>
                <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Attending Physician: Dr. Sarah Chen
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'HR', val: '72 bpm', color: 'text-emerald-400' },
                  { label: 'BP', val: '118/76', color: 'text-emerald-400' },
                  { label: 'SpO2', val: '98%', color: 'text-emerald-400' },
                  { label: 'Temp', val: '98.6°F', color: 'text-emerald-400' }
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">{stat.label}</p>
                    <p className={`text-lg font-black ${stat.color}`}>{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Original Appointments Section moved here */}
            <div className="glass-card p-8 border-white/5 group">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20 group-hover:scale-110 transition-transform">
                    <Calendar size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Visit Timeline</h2>
                </div>
                <Link to="/family/visits" className="text-[10px] font-bold text-teal-400/60 hover:text-teal-400 uppercase tracking-widest transition-colors">History</Link>
              </div>

              <div className="space-y-6">
                {appointments.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                    <p className="text-xs text-gray-600 font-medium italic">Next visitation is not yet scheduled.</p>
                  </div>
                ) : (
                  appointments.map((appt) => (
                    <div key={appt.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/20 transition-all hover:translate-x-1 group/item">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-white font-bold tracking-tight text-lg group-hover/item:text-teal-400 transition-colors">Clinical Follow-up</p>
                        <Badge className="text-[10px] font-bold uppercase tracking-widest border border-yellow-500/30 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                          {appt.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-gray-500 font-medium font-mono">
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-teal-500/60" /> {format(new Date(appt.scheduled_date), 'MMM d, yyyy')}</span>
                        <span className="flex items-center gap-2 border-l border-white/10 pl-6"><Clock size={14} className="text-teal-500/60" /> {appt.scheduled_time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Record Clarification Quick Link */}
            <div className="glass-card p-8 border-white/5 bg-gradient-to-br from-purple-500/5 to-blue-500/5 group flex flex-col justify-between">
              <div>
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 w-fit mb-6">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight mb-2">Record Clarification</h2>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">Use our AI assistant to translate complex medical terminology into plain English.</p>
              </div>
              <Link to="/family/chat" className="mt-8 flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/btn">
                <span className="text-xs font-bold text-white uppercase tracking-widest">Ask Assistant</span>
                <ChevronRight size={16} className="text-purple-400 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Medications Section */}
          <div className="glass-card p-8 border-white/5 group h-full">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/20 group-hover:scale-110 transition-transform">
                  <Pill size={20} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Prescriptions</h2>
              </div>
            </div>

            {!member.can_view_medications ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                <ShieldCheck size={40} className="mb-4 opacity-10" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-500/50">Restricted</p>
                <p className="text-[10px] max-w-[180px] mt-2 font-medium opacity-60">
                  HIPAA protection active.
                </p>
              </div>
            ) : medications.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-xs text-gray-600 font-medium italic">No active records.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {medications.map((med) => (
                  <div key={med.id} className="flex gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-pink-500/20 transition-all">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                      <Pill size={20} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm tracking-tight">{med.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold">{med.dosage}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Support */}
          <div className="glass-card p-8 border-teal-500/10 bg-teal-500/5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-teal-400" /> Need Help?
            </h3>
            <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">Our coordinators are available for direct secure messaging.</p>
            <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white text-[10px] uppercase font-black tracking-widest h-10">Start Chat</Button>
          </div>
        </div>
      </div>

      {/* Access Permissions Banner */}
      <div className="glass-card p-6 bg-gradient-to-r from-teal-500/5 via-transparent to-blue-500/5 border-white/5 flex flex-col md:flex-row items-center gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="p-3 rounded-full bg-teal-500/10 text-teal-400 shrink-0">
          <ShieldCheck size={20} />
        </div>
        <p className="text-xs text-gray-500 font-medium leading-relaxed text-center md:text-left">
          Secure Health Link established. You are viewing <span className="text-teal-400 font-bold">{patient.full_name}</span>'s records under family guardian protocols.
          <span className="block mt-1 font-light opacity-60">This session is monitored for data security compliance.</span>
        </p>
        <div className="flex-1" />
        <button className="whitespace-nowrap px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest">
          Request Full Records
        </button>
      </div>
    </div>
  );
};

export default FamilyDashboard;
