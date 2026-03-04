import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { callAgent } from '@/services/aiAgent';
import { Link } from 'react-router-dom';
import { Calendar, Pill, Bell, MessageSquare, Search, Clock, User, Heart, Droplets, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Patient {
  id: string;
  full_name: string;
  age: number;
  blood_type: string;
  allergies: string[];
  primary_doctor_id: string;
}

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  doctor: { full_name: string; specialization: string } | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

const cardStyle = "rounded-2xl border p-6" as const;
const cardClasses = "bg-[#0C0F1A] border-[#1A1F35]";

const statusColors: Record<string, string> = {
  scheduled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const notifIcons: Record<string, typeof Bell> = {
  appointment: Calendar,
  medication: Pill,
  alert: AlertTriangle,
  message: MessageSquare,
};

const PatientDashboard = () => {
  const { user, profile, db_id } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [primaryDoctor, setPrimaryDoctor] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    if (!db_id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // 1. Get patient record
      const { data: patientData } = await (externalSupabase as any)
        .from('patients')
        .select('*')
        .eq('user_id', db_id)
        .maybeSingle();

      if (!patientData) {
        setLoading(false);
        return;
      }
      setPatient(patientData as any);

      // Parallel fetches
      const [apptRes, medRes, notifRes, docRes] = await Promise.all([
        // Upcoming appointments
        (externalSupabase as any)
          .from('appointments')
          .select('id, scheduled_date, scheduled_time, status, doctor:doctor_id(user_id)')
          .eq('patient_id', patientData.id)
          .in('status', ['scheduled', 'confirmed'])
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .order('scheduled_date', { ascending: true })
          .limit(5),

        // Active medications
        (externalSupabase as any)
          .from('medications')
          .select('id, name, dosage, frequency, instructions')
          .eq('patient_id', patientData.id)
          .eq('is_active', true),

        // Recent notifications
        (externalSupabase as any)
          .from('notifications')
          .select('id, type, title, message, created_at')
          .eq('recipient_id', db_id)
          .order('created_at', { ascending: false })
          .limit(10),

        // Primary doctor details (from users table via doctors user_id)
        patientData.primary_doctor_id
          ? (externalSupabase as any)
            .from('doctors')
            .select('id, specialization, doctor_info:user_id(full_name)')
            .eq('id', patientData.primary_doctor_id)
            .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      // Need careful mapping for appointments since doctor info is in users table
      const rawAppts = (apptRes.data as any) || [];
      const apptsWithDoc = await Promise.all(rawAppts.map(async (appt: any) => {
        const { data: userData } = await (externalSupabase as any)
          .from('doctors')
          .select('specialization, user:user_id(full_name)')
          .eq('user_id', appt.doctor?.user_id)
          .maybeSingle();
        return {
          ...appt,
          doctor: {
            full_name: userData?.user?.full_name || 'Medical Staff',
            specialization: userData?.specialization || 'Department'
          }
        };
      }));

      setAppointments(apptsWithDoc);
      setMedications((medRes.data as any) || []);
      setNotifications((notifRes.data as any) || []);

      if (docRes.data) {
        setPrimaryDoctor((docRes.data as any).doctor_info?.full_name || '');
      }

      setLoading(false);
    };

    fetchData();
  }, [db_id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
        <Skeleton className="h-40 w-full rounded-2xl bg-[#1A1F35]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-72 rounded-2xl bg-[#1A1F35]" />
          ))}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        <p>No patient record found for this account.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fade-in" style={{ background: '#04060c', minHeight: '100%' }}>
      {/* Welcome Card */}
      <div className="glass-card p-8 md:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-teal-500/10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-white font-display mb-3 tracking-tight">
              Welcome back, <span className="text-gradient">{profile?.full_name?.split(' ')[0] || 'Patient'}</span> 👋
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-500">
              <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <User size={16} className="text-teal-400" /> Age: {patient.age}
              </span>
              <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Droplets size={16} className="text-red-400" /> {patient.blood_type}
              </span>
              {primaryDoctor && (
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <Heart size={16} className="text-teal-400" /> Dr. {primaryDoctor}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/patient/appointments"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-teal-500/20 hover:scale-105 transition-all active:scale-95"
            >
              Book Visit
            </Link>
          </div>
        </div>

        {patient.allergies && patient.allergies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 relative z-10">
            <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-widest flex items-center gap-2 w-full mb-1">
              <AlertTriangle size={12} /> Critical Allergies
            </span>
            {patient.allergies.map((allergy, i) => (
              <Badge key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 text-xs font-bold rounded-full">
                {allergy}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="glass-card p-8 animate-slide-up group" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20 shadow-inner group-hover:scale-110 transition-transform">
                <Calendar size={20} />
              </div>
              <h2 className="text-xl font-bold text-white font-display tracking-tight">Active Visits</h2>
            </div>
            <Link to="/patient/appointments" className="text-xs font-bold text-teal-400/60 hover:text-teal-400 uppercase tracking-widest transition-colors">View All</Link>
          </div>

          {appointments.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
              <p className="text-xs text-gray-600 font-medium italic">No scheduled visits.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {appointments.map((appt) => {
                const doc = Array.isArray(appt.doctor) ? appt.doctor[0] : appt.doctor;
                return (
                  <div key={appt.id} className="relative pl-6 border-l-2 border-teal-500/20 hover:border-teal-500 transition-colors py-1 group/item">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-white group-hover/item:text-teal-400 transition-colors">
                          Dr. {doc?.full_name || 'Medical Staff'}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">{doc?.specialization || 'Clinical Services'}</p>
                      </div>
                      <Badge className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColors[appt.status] || statusColors.scheduled}`}>
                        {appt.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500 font-medium">
                      <span className="flex items-center gap-1.5 bg-white/[0.02] px-2 py-1 rounded-md">
                        <Calendar size={12} className="text-teal-500/70" /> {format(new Date(appt.scheduled_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1.5 bg-white/[0.02] px-2 py-1 rounded-md">
                        <Clock size={12} className="text-teal-500/70" /> {appt.scheduled_time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Medications */}
        <div className="glass-card p-8 animate-slide-up group" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 shadow-inner group-hover:scale-110 transition-transform">
                <Pill size={20} />
              </div>
              <h2 className="text-xl font-bold text-white font-display tracking-tight">Current Meds</h2>
            </div>
            <Link to="/patient/medications" className="text-xs font-bold text-blue-400/60 hover:text-blue-400 uppercase tracking-widest transition-colors">Safety Guide</Link>
          </div>

          {medications.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
              <p className="text-xs text-gray-600 font-medium italic">No active prescriptions.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {medications.map((med) => (
                <div key={med.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl hover:border-blue-500/20 transition-all hover:translate-x-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white tracking-tight">{med.name}</p>
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <Pill size={12} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-blue-500/5 text-blue-400/80 px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter border border-blue-500/10">
                      {med.dosage}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium tracking-tight">· {med.frequency}</span>
                  </div>
                  {med.instructions && (
                    <p className="text-[11px] text-gray-500 mt-2 italic leading-relaxed line-clamp-2">"{med.instructions}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="glass-card p-8 animate-slide-up group" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 shadow-inner group-hover:scale-110 transition-transform">
                <Bell size={20} />
              </div>
              <h2 className="text-xl font-bold text-white font-display tracking-tight">Recent Updates</h2>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
              <p className="text-xs text-gray-600 font-medium italic">No recent alerts.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {notifications.map((notif) => {
                const Icon = notifIcons[notif.type] || Bell;
                return (
                  <div key={notif.id} className="flex gap-4 group/notif transition-opacity hover:opacity-80">
                    <div className="mt-1 shrink-0 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover/notif:text-teal-400 group-hover/notif:border-teal-500/30 transition-all">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate tracking-tight">{notif.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed font-light">{notif.message}</p>
                      <p className="text-[9px] text-gray-600 mt-1.5 font-bold uppercase tracking-tighter">
                        {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
        {[
          { icon: MessageSquare, label: 'Chat with AI', sub: 'Clinical assistant', color: 'from-teal-500/20 to-blue-500/20', link: '/patient/chat' },
          { icon: Calendar, label: 'Book Appointment', sub: 'Specialist visits', color: 'from-blue-500/20 to-purple-500/20', link: '/patient/appointments' },
          { icon: Search, label: 'Check Symptoms', sub: 'Rapid triage', color: 'from-purple-500/20 to-pink-500/20', link: '/patient/chat?prompt=symptom-check' }
        ].map((item, idx) => (
          <Link
            key={idx}
            to={item.link}
            className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} border border-white/5 hover:border-white/10 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-5 group shadow-xl shadow-black/20`}
          >
            <div className="p-4 rounded-2xl bg-white/10 text-white shadow-inner group-hover:scale-110 transition-transform">
              <item.icon size={28} />
            </div>
            <div>
              <p className="text-lg font-bold text-white tracking-tight">{item.label}</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Floating Chat Button */}
      <Link
        to="/patient/chat"
        className="fixed bottom-10 right-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-2xl shadow-teal-500/40 flex items-center justify-center hover:scale-110 transition-all active:scale-90 z-50 group md:hidden hover:rotate-6"
      >
        <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
      </Link>
    </div>
  );
};

export default PatientDashboard;
