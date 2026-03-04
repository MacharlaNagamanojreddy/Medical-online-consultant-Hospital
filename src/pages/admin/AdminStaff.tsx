import { useEffect, useState } from 'react';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Users, Mail, Phone, Shield, Search, MoreHorizontal, Filter, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StaffData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string;
  avatar_url: string | null;
}

const AdminStaff = () => {
  const [staff, setStaff] = useState<StaffData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await (externalSupabase as any).from('users').select('id, full_name, email, role, phone, avatar_url').order('full_name', { ascending: true });
    if (data) setStaff(data);
    setLoading(false);
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, any> = {
      admin: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      doctor: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      family: { color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
      patient: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    };
    const style = roles[role] || roles.patient;
    return <Badge className={style.color}>{(role || 'staff').toUpperCase()}</Badge>;
  };

  const filteredStaff = staff.filter(person => {
    const matchesRole = activeTab === 'all' || person.role === activeTab;
    const matchesSearch = person.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  useEffect(() => {
    fetchStaff();
  }, []);

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
          <h1 className="text-2xl font-bold text-white mb-1 font-display">Staff Directory</h1>
          <p className="text-gray-400 text-sm">Manage hospital personnel and access roles</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              className="bg-[#0C0F1A] border border-[#1A1F35] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-teal-500/50 w-full"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
            <TabsList className="bg-[#0C0F1A] border border-[#1A1F35]">
              <TabsTrigger value="all" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white uppercase text-[10px] font-bold tracking-widest px-4">All</TabsTrigger>
              <TabsTrigger value="doctor" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white uppercase text-[10px] font-bold tracking-widest px-4">Doctors</TabsTrigger>
              <TabsTrigger value="admin" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white uppercase text-[10px] font-bold tracking-widest px-4">Admins</TabsTrigger>
              <TabsTrigger value="family" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white uppercase text-[10px] font-bold tracking-widest px-4">Family</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1A1F35] bg-[#0C0F1A] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1A1F35] bg-[#0C0F1A]">
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Member</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((person) => (
              <tr key={person.id} className="border-b border-[#1A1F35] last:border-0 hover:bg-[#1A1F35]/10 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                      {person.avatar_url ? <img src={person.avatar_url} className="w-full h-full rounded-full object-cover" /> : <Users size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{person.full_name}</p>
                      <p className="text-xs text-gray-500">ID: {person.id ? person.id.toString().slice(0, 8) : 'N/A'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">{getRoleBadge(person.role)}</td>
                <td className="p-4">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold uppercase tracking-tighter">
                    <Clock size={10} className="mr-1" /> On Duty
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Mail size={12} className="text-teal-500" /> {person.email}
                    </div>
                    {person.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Phone size={12} className="text-teal-500" /> {person.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-[#1A1F35] transition-all">
                    <MoreHorizontal size={18} />
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

export default AdminStaff;
