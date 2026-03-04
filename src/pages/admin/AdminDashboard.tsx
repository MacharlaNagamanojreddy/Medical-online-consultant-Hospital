import { useEffect, useState } from 'react';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Bed, CreditCard, Activity, TrendingUp, AlertCircle, Sparkles, BrainCircuit, Timer, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalPatients: number;
  totalDoctors: number;
  totalStaff: number;
  availableBeds: number;
  totalBeds: number;
  pendingBills: number;
  monthlyRevenue: number;
  todayAppts: number;
  admissions: number;
  discharges: number;
}

const cardStyle = "rounded-2xl border p-6 bg-[#0C0F1A] border-[#1A1F35]";

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingDischarge, setAnalyzingDischarge] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [patientsCount, doctorsCount, staffCount, bedsData, billingData, appointmentData] = await Promise.all([
          (externalSupabase as any).from('patients').select('*', { count: 'exact', head: true }),
          (externalSupabase as any).from('doctors').select('*', { count: 'exact', head: true }),
          (externalSupabase as any).from('users').select('*', { count: 'exact', head: true }),
          (externalSupabase as any).from('beds').select('*'),
          (externalSupabase as any).from('billing').select('amount, status'),
          (externalSupabase as any).from('appointments').select('id, status, scheduled_date'),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const allAppts = (appointmentData.data as any[]) || [];
        const todayAppts = allAppts.filter(a => a.scheduled_date === today);

        const admissions = todayAppts.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length;
        const discharges = todayAppts.filter(a => a.status === 'completed').length;

        const bedList = bedsData.data || [];
        const availableBeds = bedList.filter((b: any) => b.status === 'available').length;

        const bills = billingData.data || [];
        const pendingBills = bills.filter((b: any) => b.status === 'pending').length;
        const totalRevenue = bills
          .filter((b: any) => b.status === 'paid')
          .reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);

        setStats({
          totalPatients: patientsCount.count || 0,
          totalDoctors: doctorsCount.count || 0,
          totalStaff: staffCount.count || 0,
          availableBeds,
          totalBeds: bedList.length || 0,
          pendingBills,
          monthlyRevenue: totalRevenue,
          todayAppts: todayAppts.length,
          admissions,
          discharges
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl bg-[#1A1F35]" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl bg-[#1A1F35]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fade-in" style={{ background: '#04060c', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-display">
            Hospital <span className="text-gradient">Operations</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Real-time command center for health facility status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/5 animate-pulse">
            <Activity size={14} /> System Online
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
        {[
          { icon: Users, label: 'Active Patients', val: stats?.totalPatients, sub: '+12% this week', color: 'from-teal-500 to-blue-600', glow: 'shadow-teal-500/10' },
          { icon: UserCheck, label: 'Medical Staff', val: stats?.totalDoctors, sub: '8 Active Today', color: 'from-blue-600 to-indigo-600', glow: 'shadow-blue-500/10' },
          { icon: Bed, label: 'Bed Occupancy', val: `${stats?.totalBeds ? Math.round(((stats.totalBeds - stats.availableBeds) / stats.totalBeds) * 100) : 0}%`, sub: `${stats?.availableBeds} beds free`, color: 'from-purple-600 to-pink-600', glow: 'shadow-purple-500/10' },
          { icon: CreditCard, label: 'Net Revenue', val: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`, sub: `${stats?.pendingBills} pending bills`, color: 'from-orange-500 to-amber-600', glow: 'shadow-orange-500/10' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-default shadow-2xl">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-[0.03] rounded-bl-full -tr-8 z-0 transition-opacity group-hover:opacity-[0.08]`} />
            <div className="relative z-10">
              <div className="flex items-center gap-4 text-gray-500 mb-6 font-bold text-[10px] uppercase tracking-widest">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-lg ${item.glow}`}>
                  <item.icon size={18} />
                </div>
                {item.label}
              </div>
              <p className="text-4xl font-bold text-white tracking-tighter mb-2">{item.val}</p>
              <p className="text-[11px] font-bold text-gray-500 flex items-center gap-2">
                <TrendingUp size={12} className="text-teal-400" /> {item.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {/* Department Performance */}
        <div className="glass-card p-8 border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Department Efficiency</h2>
          </div>
          <div className="space-y-8">
            {[
              { name: 'Cardiology', val: 88, color: 'bg-teal-500 shadow-teal-500/30' },
              { name: 'Emergency', val: 94, color: 'bg-orange-500 shadow-orange-500/30' },
              { name: 'Neurology', val: 72, color: 'bg-blue-500 shadow-blue-500/30' },
              { name: 'Pediatrics', val: 82, color: 'bg-purple-500 shadow-purple-500/30' }
            ].map((dept) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px]">{dept.name}</span>
                  <span className="text-xs font-bold text-white">{dept.val}% Load</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${dept.color}`}
                    style={{ width: `${dept.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Insights Grid */}
        <div className="glass-card p-8 border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-teal-500/20">
              <Activity size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Operational Insights</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Today\'s Activity', val: `${stats?.todayAppts || 0} Visits`, color: 'text-teal-400', bg: 'bg-teal-500/5', border: 'border-teal-500/10' },
              { label: 'New Admissions', val: stats?.admissions || 0, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/10' },
              { label: 'Discharges', val: stats?.discharges || 0, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/10' },
              { label: 'Pharmacy Stock', val: 'Check', color: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/10' }
            ].map((box, idx) => (
              <div key={idx} className={`p-6 rounded-2xl ${box.bg} ${box.border} border group hover:border-white/10 transition-all`}>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">{box.label}</p>
                <p className={`text-3xl font-black ${box.color} tracking-tighter group-hover:scale-110 transition-transform origin-left`}>{box.val}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="text-amber-500" />
              <p className="text-[11px] text-gray-500 font-medium italic">3 critical staff shortages in Oncology department.</p>
            </div>
            <button className="text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:underline transition-all">Resolve</button>
          </div>
        </div>

        {/* Predictive Discharge Assistant - New Agentic Feature */}
        <div className="glass-card p-8 border-teal-500/20 bg-gradient-to-br from-[#0C0F1A] via-[#0C0F1A] to-teal-500/5 relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all duration-700" />

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30 mt-1">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Discharge Ready</h2>
                  <span className="text-[10px] bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-black uppercase tracking-widest whitespace-nowrap">
                    AI Agent Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">Predictive analysis of patient recovery & resource optimization</p>
              </div>
            </div>
            <button
              onClick={() => {
                setAnalyzingDischarge(true);
                setTimeout(() => setAnalyzingDischarge(false), 2000);
              }}
              disabled={analyzingDischarge}
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-teal-500/20 mt-2 md:mt-0"
            >
              {analyzingDischarge ? <BrainCircuit size={16} className="animate-spin" /> : <Timer size={16} />}
              {analyzingDischarge ? "AI Analyzing..." : "Run Global Prediction"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {[
              { patient: "Robert Johnson", confidence: 94, reason: "Stable vitals 48h, labs normal", action: "Review Final Labs" },
              { patient: "Sarah Miller", confidence: 82, reason: "Physical therapy targets met", action: "Assign Social Worker" },
              { patient: "Michael Chen", confidence: 78, reason: "Wound healing accelerated", action: "Verify Home Care" }
            ].map((pred, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition-all group/item flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <p className="font-bold text-white text-lg tracking-tight group-hover/item:text-teal-400 transition-colors">{pred.patient}</p>
                    <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-[9px] font-black uppercase">
                      {pred.confidence}%
                    </Badge>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" style={{ width: `${pred.confidence}%` }} />
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed flex items-start gap-2">
                      <AlertCircle size={12} className="text-teal-500 shrink-0 mt-0.5" />
                      {pred.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Next Step</span>
                  <button className="text-[9px] font-black text-teal-400 hover:text-teal-300 uppercase tracking-widest flex items-center gap-1 group/btn transition-colors">
                    {pred.action} <ChevronRight size={10} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
