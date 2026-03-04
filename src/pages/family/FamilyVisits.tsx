import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, ChevronRight, Activity, Bell, MapPin, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface VisitData {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  patient_name?: string;
  doctor: {
    specialization: string;
    user: { full_name: string } | null;
  } | null;
}

const FamilyVisits = () => {
  const { db_id } = useAuth();
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDate, setRequestDate] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchFamilyVisits = async () => {
    setLoading(true);
    try {
      // 1. Get the linked patient for this family member
      const { data: familyData } = await (externalSupabase as any)
        .from('family_members')
        .select(`
          patient_id,
          patient:patient_id (
            user:user_id (full_name)
          )
        `)
        .eq('user_id', db_id)
        .maybeSingle();

      if (familyData?.patient_id) {
        const patientName = familyData.patient?.user?.full_name || 'Relative';

        // 2. Fetch appointments for the linked patient
        const { data, error } = await (externalSupabase as any)
          .from('appointments')
          .select(`
            id,
            scheduled_date,
            scheduled_time,
            status,
            doctor:doctor_id (
              specialization,
              user:user_id (full_name)
            )
          `)
          .eq('patient_id', familyData.patient_id)
          .order('scheduled_date', { ascending: false });

        if (data) {
          setVisits(data.map((v: any) => ({ ...v, patient_name: patientName })) as any);
        }
        if (error) console.error('Error fetching visits:', error);
      }
    } catch (err) {
      console.error('Error in fetchFamilyVisits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (db_id) fetchFamilyVisits();
  }, [db_id]);

  const handleRequestVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDate || !requestTime) return;

    setIsSubmitting(true);
    // Mocking the request since there's no specific 'visitation_requests' table in current schema
    setTimeout(() => {
      toast({
        title: "Request Sent",
        description: "Your visitation request has been submitted for review.",
      });
      setRequestDate('');
      setRequestTime('');
      setIsSubmitting(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl bg-[#1A1F35]" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">Visit Schedule</h1>
          <p className="text-gray-400 text-sm">Monitor upcoming appointments for your family members</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-teal-400 font-medium px-4 py-2 bg-teal-500/5 border border-teal-500/10 rounded-xl">
          <Bell size={14} /> SMS Alerts Enabled
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Visit History */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="text-teal-400" size={20} /> Clinical Visits
          </h2>
          <div className="space-y-4">
            {visits.length === 0 ? (
              <div className="text-center py-20 bg-[#0C0F1A] border border-[#1A1F35] rounded-2xl">
                <Calendar className="mx-auto text-gray-700 mb-4" size={48} />
                <p className="text-gray-400">No upcoming visits scheduled.</p>
              </div>
            ) : (
              visits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border p-5 bg-[#0C0F1A] border-[#1A1F35] hover:border-teal-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group shadow-xl shadow-black/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">Patient: {visit.patient_name}</h3>
                      <p className="text-sm text-gray-500">Dr. {visit.doctor?.user?.full_name} · <span className="text-teal-400">{visit.doctor?.specialization}</span></p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Time</span>
                      <div className="flex items-center gap-3 text-sm text-white font-medium font-mono">
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-teal-500/60" /> {format(new Date(visit.scheduled_date), 'MMM d, yyyy')}</span>
                        <span className="flex items-center gap-1.5 border-l border-white/5 pl-3"><Clock size={14} className="text-teal-500/60" /> {visit.scheduled_time}</span>
                      </div>
                    </div>
                    <div className="flex flex-col min-w-[100px]">
                      <span className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Status</span>
                      <Badge className={`uppercase text-[9px] font-black tracking-widest border-none ${visit.status === 'confirmed' ? 'bg-teal-500/10 text-teal-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {visit.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar: Request & Policies */}
        <div className="space-y-8">
          <div className="glass-card p-8 border-teal-500/10 bg-gradient-to-br from-teal-500/5 to-transparent">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Bell className="text-teal-400" size={20} /> Request Visit
            </h3>
            <form onSubmit={handleRequestVisit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Preferred Date</Label>
                <Input
                  type="date"
                  className="bg-[#1A1F35]/50 border-[#1A1F35] text-white h-11"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Preferred Time</Label>
                <Input
                  type="time"
                  className="bg-[#1A1F35]/50 border-[#1A1F35] text-white h-11"
                  value={requestTime}
                  onChange={(e) => setRequestTime(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black uppercase tracking-widest h-11 mt-4 shadow-lg shadow-teal-500/20">
                {isSubmitting ? 'Sending...' : 'Submit Request'}
              </Button>
            </form>
          </div>

          <div className="glass-card p-8 border-white/5 space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-amber-500" size={16} /> Visiting Policies
            </h3>
            <div className="space-y-4">
              {[
                { icon: Clock, title: 'Hours', desc: '9:00 AM - 8:00 PM' },
                { icon: User, title: 'Limit', desc: 'Max 2 visitors per session' },
                { icon: MapPin, title: 'Location', desc: 'Main Ward, Level 4' }
              ].map((policy, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-teal-400"><policy.icon size={16} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-tighter">{policy.title}</p>
                    <p className="text-xs text-gray-500 font-medium">{policy.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyVisits;
