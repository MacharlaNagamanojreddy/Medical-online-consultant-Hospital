import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Pill, Clock, Calendar, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date: string;
  is_active: boolean;
}

const PatientMedications = () => {
  const { db_id } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db_id) return;

    const fetchMedications = async () => {
      setLoading(true);
      try {
        const { data: patientData } = await (externalSupabase as any)
          .from('patients')
          .select('id')
          .eq('user_id', db_id)
          .maybeSingle();

        if (patientData) {
          const { data } = await (externalSupabase as any)
            .from('medications')
            .select('*')
            .eq('patient_id', patientData.id)
            .order('is_active', { ascending: false });

          if (data) setMedications(data);
        }
      } catch (err) {
        console.error('Error fetching medications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [db_id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl bg-[#1A1F35]" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">My Medications</h1>
          <p className="text-gray-400 text-sm">Review your active prescriptions and treatment plans</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl text-xs">
          <AlertCircle size={14} className="shrink-0" />
          <span>Consult your doctor before changing dosage</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {medications.length === 0 ? (
          <div className="text-center py-20 bg-[#0C0F1A] border border-[#1A1F35] rounded-2xl">
            <Pill className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-400">No medication records found.</p>
          </div>
        ) : (
          medications.map((med) => (
            <div key={med.id} className={`rounded-2xl border p-5 bg-[#0C0F1A] hover:border-teal-500/30 transition-all ${med.is_active ? 'border-[#1A1F35]' : 'border-gray-800 opacity-60'}`}>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${med.is_active ? 'bg-pink-500/10 text-pink-400' : 'bg-gray-800 text-gray-500'}`}>
                    <Pill size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-white">{med.name}</h3>
                      {med.is_active ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-[10px]">Former</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-pink-400 font-medium">{med.dosage}</span>
                      <span className="text-gray-500 flex items-center gap-1.5"><Clock size={14} /> {med.frequency}</span>
                      <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={14} /> Started: {med.start_date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 md:max-w-md">
                  <div className="bg-[#1A1F35]/30 rounded-xl p-3 border border-[#1A1F35]">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Info size={12} className="text-teal-400" /> Instructions
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed italic">
                      "{med.instructions || 'Follow as prescribed by your doctor.'}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientMedications;
