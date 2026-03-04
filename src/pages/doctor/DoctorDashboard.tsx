import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Calendar, Users, Star, ClipboardList, Clock, User, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DoctorData {
  id: string;
  specialization: string;
  department: string;
  rating: number;
  total_patients: number;
  years_experience: number;
}

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  patient_id: string;
  patient: { full_name: string; email: string } | null;
}

const cardStyle = "rounded-2xl border p-6 bg-[#0C0F1A] border-[#1A1F35]";

const statusColors: Record<string, string> = {
  scheduled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DoctorDashboard = () => {
  const { profile, db_id } = useAuth();
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db_id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get doctor profile details
        const { data: docData } = await (externalSupabase as any)
          .from('doctors')
          .select('*')
          .eq('user_id', db_id)
          .maybeSingle();

        if (docData) {
          setDoctor(docData);

          // 2. Fetch appointments linked to this doctor
          const { data: apptData } = await (externalSupabase as any)
            .from('appointments')
            .select('id, scheduled_date, scheduled_time, status, patient_id')
            .eq('doctor_id', docData.id)
            .order('scheduled_date', { ascending: true })
            .limit(10);

          if (apptData) {
            // Fetch patient names for these appointments
            const apptsWithPatient = await Promise.all(apptData.map(async (appt: any) => {
              const { data: userData } = await (externalSupabase as any)
                .from('users')
                .select('full_name, email')
                .eq('id', (await (externalSupabase as any).from('patients').select('user_id').eq('id', appt.patient_id).maybeSingle()).data?.user_id)
                .maybeSingle();
              return {
                ...appt,
                patient: userData || { full_name: 'Patient', email: '' }
              };
            }));
            setAppointments(apptsWithPatient as any);
          }
        }
      } catch (err) {
        console.error('Error fetching doctor data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db_id]);

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

  if (!doctor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 space-y-4">
        <p>No doctor record found for this account.</p>
        <p className="text-sm opacity-60">Make sure your role is set to 'doctor' in the database.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <Users className="text-teal-400" size={24} />
          </div>
          <p className="text-gray-400 text-sm">Total Patients</p>
          <p className="text-2xl font-bold text-white mt-1">{doctor.total_patients}</p>
        </div>
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <Star className="text-yellow-400" size={24} />
          </div>
          <p className="text-gray-400 text-sm">Average Rating</p>
          <p className="text-2xl font-bold text-white mt-1">{doctor.rating} / 5.0</p>
        </div>
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <Clock className="text-teal-400" size={24} />
          </div>
          <p className="text-gray-400 text-sm">Experience</p>
          <p className="text-2xl font-bold text-white mt-1">{doctor.years_experience} Years</p>
        </div>
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <ClipboardList className="text-teal-400" size={24} />
          </div>
          <p className="text-gray-400 text-sm">Dept / Specialty</p>
          <p className="text-lg font-bold text-white mt-1 truncate">{doctor.specialization}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Schedule Column */}
        <div className={`lg:col-span-2 ${cardStyle}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-teal-400" size={20} />
              <h2 className="text-xl font-bold text-white">Upcoming Appointments</h2>
            </div>
          </div>

          <div className="space-y-4">
            {appointments.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">No appointments scheduled.</p>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#1A1F35]/30 border border-[#1A1F35] hover:border-teal-500/30 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{appt.patient?.full_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(appt.scheduled_date), 'MMM d')}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {appt.scheduled_time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <Badge className={cn("text-[10px] uppercase px-2 py-0", statusColors[appt.status])}>{appt.status}</Badge>
                    <Link
                      to={`/doctor/soap-notes?patientId=${appt.patient_id}&appointmentId=${appt.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-medium hover:bg-teal-500/20 transition-colors"
                    >
                      <ClipboardList size={14} /> Start Visit
                    </Link>
                    <ChevronRight className="text-gray-600 hidden sm:block" size={18} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Doctor Info Card */}
        <div className={cardStyle}>
          <h3 className="text-lg font-bold text-white mb-6">Doctor Details</h3>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Full Name</p>
              <p className="text-white font-medium">{profile?.full_name || 'Dr. Practitioner'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Department</p>
              <p className="text-teal-400 font-medium">{doctor.department}</p>
            </div>
            <div className="pt-6 border-t border-[#1A1F35]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Profile Status</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mt-4">
                You are currently viewing all patient appointments and records for your assigned department.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
