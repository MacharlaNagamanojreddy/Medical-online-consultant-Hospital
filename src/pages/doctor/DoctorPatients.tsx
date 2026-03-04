import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Users, Search, Filter, Mail, Phone, ExternalLink, Activity, Heart, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PatientData {
  id: string;
  blood_type: string;
  allergies: string[];
  chronic_conditions: string[];
  user: {
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
  } | null;
}

const DoctorPatients = () => {
  const { db_id } = useAuth();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db_id) return;

    const fetchPatients = async () => {
      setLoading(true);
      try {
        // 1. Get doctor record
        const { data: doctorData } = await (externalSupabase as any)
          .from('doctors')
          .select('id')
          .eq('user_id', db_id)
          .maybeSingle();

        if (doctorData) {
          // 2. Fetch patients where this doctor is primary
          const { data, error } = await (externalSupabase as any)
            .from('patients')
            .select(`
              id,
              blood_type,
              allergies,
              chronic_conditions,
              user:user_id (
                full_name,
                email,
                phone,
                avatar_url
              )
            `)
            .eq('primary_doctor_id', doctorData.id);

          if (data) setPatients(data as any);
          if (error) console.error('Error fetching patients:', error);
        }
      } catch (err) {
        console.error('Error in fetchPatients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [db_id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl bg-[#1A1F35]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">Patient Directory</h1>
          <p className="text-gray-400 text-sm">Review clinical data for patients under your primary care</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input className="bg-[#0C0F1A] border border-[#1A1F35] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-teal-500/50 w-full md:w-64" placeholder="Find patient..." />
          </div>
          <button className="p-2 rounded-xl bg-[#0C0F1A] border border-[#1A1F35] text-gray-400 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-[#0C0F1A] border border-[#1A1F35] rounded-2xl">
            <Users className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-400">No primary patients found.</p>
          </div>
        ) : (
          patients.map((patient) => (
            <div key={patient.id} className="rounded-2xl border p-5 bg-[#0C0F1A] border-[#1A1F35] hover:border-teal-500/30 transition-all group relative overflow-hidden">
              {/* Quick Stats Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                    {patient.user?.avatar_url ? <img src={patient.user.avatar_url} className="w-full h-full rounded-full object-cover" /> : <Users size={24} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{patient.user?.full_name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1.6">
                      <Activity size={12} className="text-teal-500" /> ID: {patient.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-mono text-xs">
                  {patient.blood_type || 'A+'}
                </Badge>
              </div>

              {/* Clinical Highlights */}
              <div className="space-y-3 mb-6">
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies?.slice(0, 2).map((allergy, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500 bg-yellow-500/5">
                      <AlertTriangle size={10} className="mr-1" /> {allergy}
                    </Badge>
                  ))}
                  {patient.chronic_conditions?.slice(0, 1).map((condition, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-teal-500/30 text-teal-500 bg-teal-500/5">
                      <Heart size={10} className="mr-1" /> {condition}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Mail size={12} className="text-teal-500" /> {patient.user?.email}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Phone size={12} className="text-teal-500" /> {patient.user?.phone || 'N/A'}
                  </div>
                </div>
              </div>

              <Button variant="ghost" className="w-full justify-between text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 border border-[#1A1F35] group-hover:border-teal-500/30 transition-all rounded-xl">
                View Medical History
                <ExternalLink size={14} />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorPatients;
