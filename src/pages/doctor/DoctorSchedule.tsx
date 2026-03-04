import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, ChevronRight, Search, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AppointmentData {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  triage_level: string;
  patient: {
    user: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  } | null;
}

const DoctorSchedule = () => {
  const { db_id } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db_id) return;

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const { data: doctorData } = await (externalSupabase as any)
          .from('doctors')
          .select('id')
          .eq('user_id', db_id)
          .maybeSingle();

        if (doctorData) {
          const { data } = await (externalSupabase as any)
            .from('appointments')
            .select(`
              id,
              scheduled_date,
              scheduled_time,
              status,
              triage_level,
              patient:patient_id (
                user:user_id (
                  full_name,
                  avatar_url
                )
              )
            `)
            .eq('doctor_id', doctorData.id)
            .order('scheduled_date', { ascending: false });

          if (data) setAppointments(data as any);
        }
      } catch (err) {
        console.error('Error in fetchSchedule:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [db_id]);

  const getTriageBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'emergency': return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Emergency</Badge>;
      case 'urgent': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Urgent</Badge>;
      case 'routine': return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">Routine</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{level || 'Scheduled'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl bg-[#1A1F35]" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">Appointment Schedule</h1>
          <p className="text-gray-400 text-sm">Review and manage your clinical appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input className="bg-[#0C0F1A] border border-[#1A1F35] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-teal-500/50 w-full" placeholder="Search appointments..." />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-20 bg-[#0C0F1A] border border-[#1A1F35] rounded-2xl">
            <Calendar className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-400">No appointments scheduled.</p>
          </div>
        ) : (
          appointments.map((appt) => (
            <div key={appt.id} className="rounded-2xl border p-4 bg-[#0C0F1A] border-[#1A1F35] hover:border-teal-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                  {appt.patient?.user?.avatar_url ? <img src={appt.patient.user.avatar_url} className="w-full h-full rounded-full object-cover" /> : <User size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{appt.patient?.user?.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Calendar size={10} className="text-teal-500" /> {format(new Date(appt.scheduled_date), 'MMM d, yyyy')}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock size={10} className="text-teal-500" /> {appt.scheduled_time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {getTriageBadge(appt.triage_level)}
                <div className="h-8 w-[1px] bg-[#1A1F35] hidden md:block" />
                <div className="flex items-center gap-2">
                  {appt.status === 'completed' ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 px-2 py-0.5 text-[10px]">
                      <CheckCircle2 size={10} className="mr-1" /> COMPLETED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-[#1A1F35] text-gray-500 text-[10px]">
                      {appt.status.toUpperCase()}
                    </Badge>
                  )}
                  <button className="p-2 rounded-lg bg-[#1A1F35] text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorSchedule;
