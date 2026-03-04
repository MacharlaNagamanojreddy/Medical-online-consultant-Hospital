import { useEffect, useState } from 'react';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Bed, CheckCircle2, XCircle, Search, Filter, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface BedData {
  id: string;
  bed_number: string;
  department: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
}

interface Patient {
  id: string;
  full_name: string;
}

const AdminBeds = () => {
  const [beds, setBeds] = useState<BedData[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isAdmitDialogOpen, setIsAdmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchBeds = async () => {
    setLoading(true);
    const { data, error } = await (externalSupabase as any)
      .from('beds')
      .select('id, bed_number, department, floor, status')
      .order('bed_number', { ascending: true });

    if (error) {
      console.error('❌ ERROR - Fetching Beds:', error);
    }

    if (data) setBeds(data);
    setLoading(false);
  };

  const fetchPatients = async () => {
    const { data } = await (externalSupabase as any)
      .from('patients')
      .select('id, user:user_id(full_name)');

    if (data) {
      setPatients(data.map((p: any) => ({
        id: p.id,
        full_name: p.user?.full_name || 'Unknown Patient'
      })));
    }
  };

  useEffect(() => {
    fetchBeds();
    fetchPatients();
  }, []);

  const handleAdmit = async () => {
    if (!selectedBed || !selectedPatientId) return;

    setIsSubmitting(true);
    try {
      const { error } = await (externalSupabase as any)
        .from('beds')
        .update({ status: 'occupied' })
        .eq('id', selectedBed.id);

      if (error) throw error;

      toast({
        title: "Patient Admitted",
        description: `Patient has been assigned to Bed ${selectedBed.bed_number}.`,
      });

      setIsAdmitDialogOpen(false);
      setSelectedBed(null);
      setSelectedPatientId('');
      fetchBeds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to admit patient.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>;
      case 'occupied': return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Occupied</Badge>;
      case 'maintenance': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Maintenance</Badge>;
      case 'reserved': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Reserved</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-32 rounded-2xl bg-[#1A1F35]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">Bed Management</h1>
          <p className="text-gray-400 text-sm">Real-time occupancy and allocation tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input className="bg-[#0C0F1A] border border-[#1A1F35] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-teal-500/50 w-full md:w-64" placeholder="Search beds..." />
          </div>
          <button className="p-2 rounded-xl bg-[#0C0F1A] border border-[#1A1F35] text-gray-400 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {beds.map((bed) => (
          <div key={bed.id} className="rounded-2xl border p-5 bg-[#0C0F1A] border-[#1A1F35] hover:border-teal-500/30 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${bed.status === 'available' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                <Bed size={20} />
              </div>
              {getStatusBadge(bed.status)}
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Bed {bed.bed_number}</h3>
            <p className="text-sm text-gray-500 mb-4">Floor {bed.floor} · {bed.department}</p>

            <div className="flex items-center justify-between pt-4 border-t border-[#1A1F35]">
              <span className="text-xs text-gray-600 uppercase tracking-wider">Hospital Bed</span>
              <button
                onClick={() => {
                  setSelectedBed(bed);
                  setIsAdmitDialogOpen(true);
                }}
                disabled={bed.status !== 'available'}
                className={`text-xs font-medium hover:underline transition-opacity ${bed.status === 'available' ? 'text-teal-400 opacity-0 group-hover:opacity-100' : 'text-gray-600 cursor-not-allowed'}`}
              >
                {bed.status === 'available' ? 'Admit Patient' : 'Manage'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isAdmitDialogOpen} onOpenChange={setIsAdmitDialogOpen}>
        <DialogContent className="bg-[#0C0F1A] border-[#1A1F35] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="text-teal-400" size={20} />
              Admit Patient to Bed {selectedBed?.bed_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient" className="text-sm text-gray-400">Select Patient</Label>
              <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                <SelectTrigger className="bg-[#1A1F35]/50 border-[#1A1F35] text-white">
                  <SelectValue placeholder="Search patients..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0C0F1A] border-[#1A1F35] text-white">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/10">
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Admitting a patient will mark this bed as <span className="text-red-400 font-bold uppercase">Occupied</span>.
                Ensure clinical clearance is obtained before final allocation.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAdmitDialogOpen(false)}
              className="border-[#1A1F35] text-gray-400 hover:text-white hover:bg-[#1A1F35]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdmit}
              disabled={!selectedPatientId || isSubmitting}
              className="bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20"
            >
              {isSubmitting ? "Processing..." : "Confirm Admission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBeds;
