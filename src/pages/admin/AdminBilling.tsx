import { useEffect, useState } from 'react';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { CreditCard, Download, ExternalLink, Search, Clock, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BillData {
  id: string;
  patient_id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  due_date: string;
  created_at: string;
  patient_name?: string;
}

const AdminBilling = () => {
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      const { data } = await (externalSupabase as any).from('billing').select('*').order('created_at', { ascending: false });

      if (data) {
        // Fetch patient names for the bills
        const billsWithNames = await Promise.all(data.map(async (bill: any) => {
          const { data: patientData } = await (externalSupabase as any)
            .from('patients')
            .select('user:user_id(full_name)')
            .eq('id', bill.patient_id)
            .maybeSingle();
          return {
            ...bill,
            patient_name: patientData?.user?.full_name || 'Patient'
          };
        }));
        setBills(billsWithNames);
      }
      setLoading(false);
    };
    fetchBills();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'overdue': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Overdue</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-[#1A1F35]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">Financial Center</h1>
          <p className="text-gray-400 text-sm">Manage hospital billing and insurance claims</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input className="bg-[#0C0F1A] border border-[#1A1F35] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-teal-500/50 w-full" placeholder="Invoice # or Patient Name" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl text-sm font-medium hover:bg-teal-500/20 transition-all">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1A1F35] bg-[#0C0F1A] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1A1F35] bg-[#0C0F1A]">
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient & Invoice</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-b border-[#1A1F35] last:border-0 hover:bg-[#1A1F35]/10 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/5 flex items-center justify-center text-teal-400 border border-teal-500/10">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{bill.patient_name}</p>
                      <p className="text-xs text-gray-500">
                        INV-2024-{bill.id ? bill.id.toString().slice(0, 4).toUpperCase() : '0000'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-white text-sm">
                  ${Number(bill.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4">{getStatusBadge(bill.status)}</td>
                <td className="p-4 text-right">
                  <div className="text-xs text-gray-400 mb-1">
                    Due: {bill.due_date ? (
                      (() => {
                        try {
                          return format(new Date(bill.due_date), 'MMM d, yyyy');
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()
                    ) : 'Not Set'}
                  </div>
                  <button className="text-[10px] text-teal-500 hover:text-teal-400 flex items-center gap-1 ml-auto">
                    View Details <ExternalLink size={10} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBilling;
