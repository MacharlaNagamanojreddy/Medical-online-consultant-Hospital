import { useEffect, useState } from 'react';
import { Brain, Pill, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { callAgent } from '@/services/aiAgent';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientBriefingCardProps {
    patientId: string;
}

const PatientBriefingCard = ({ patientId }: PatientBriefingCardProps) => {
    const [loading, setLoading] = useState(true);
    const [briefing, setBriefing] = useState<string>('');
    const [patientData, setPatientData] = useState<any>(null);

    useEffect(() => {
        const fetchAndSummarize = async () => {
            setLoading(true);
            try {
                // 1. Fetch patient comprehensive history
                const { data: patient } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', patientId)
                    .maybeSingle();

                if (!patient) return;

                const [meds, appts, records] = await Promise.all([
                    supabase.from('medications').select('name, dosage, frequency').eq('patient_id', patientId).eq('is_active', true),
                    supabase.from('appointments').select('scheduled_date, status').eq('patient_id', patientId).limit(5),
                    supabase.from('medical_records').select('record_type, content, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(3)
                ]);

                const fullContext = {
                    name: patient.full_name,
                    age: patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'Unknown',
                    allergies: patient.allergies || [],
                    chronic_conditions: patient.chronic_conditions || [],
                    active_medications: meds.data || [],
                    recent_records: records.data || [],
                    upcoming_appointments: appts.data || []
                };

                setPatientData(fullContext);

                // 2. Call AI Agent for briefing
                const response = await callAgent({
                    agent_type: 'doctor_agent',
                    message: `Generate a concise clinical briefing for Dr. Practitioner about patient ${patient.full_name}. Focus on their active medications, allergies, and recent consults.`,
                    patient_context: fullContext as any
                });

                setBriefing(response.reply);
            } catch (err) {
                console.error('Error generating briefing:', err);
                setBriefing('Failed to generate clinical briefing. Please review records manually.');
            } finally {
                setLoading(false);
            }
        };

        if (patientId) fetchAndSummarize();
    }, [patientId]);

    if (loading) {
        return (
            <div className="p-6 rounded-2xl bg-[#0C0F1A] border border-[#1A1F35] space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Brain className="text-teal-400 animate-pulse" size={20} />
                    <h3 className="text-lg font-bold text-white">AI Clinical Briefing</h3>
                </div>
                <Skeleton className="h-4 w-full bg-[#1A1F35]" />
                <Skeleton className="h-4 w-[90%] bg-[#1A1F35]" />
                <Skeleton className="h-4 w-[95%] bg-[#1A1F35]" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl border p-6 bg-[#0C0F1A] border-[#1A1F35] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                <Brain size={120} />
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                        <Brain size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white font-display">Clinical Intelligence</h3>
                </div>
                <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-[10px] uppercase">
                    AI Generated
                </Badge>
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed mb-6">
                {briefing}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#1A1F35]">
                <div className="flex items-start gap-2">
                    <Pill size={14} className="text-teal-400 mt-0.5" />
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Active Meds</p>
                        <p className="text-xs text-white font-medium">{patientData?.active_medications?.length || 0} Registered</p>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-red-400 mt-0.5" />
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Allergies</p>
                        <p className="text-xs text-white font-medium">{patientData?.allergies?.length || 0} Known</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientBriefingCard;
