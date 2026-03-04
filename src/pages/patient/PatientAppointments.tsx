import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, User, ChevronRight, Search, Plus, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  doctor: {
    id: string;
    specialization: string;
    user: { full_name: string } | null;
  } | null;
}

const PatientAppointments = () => {
  const { db_id } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [patientRecordId, setPatientRecordId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!db_id) return;

    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const { data: patientData } = await (externalSupabase as any)
          .from('patients')
          .select('id')
          .eq('user_id', db_id)
          .maybeSingle();

        if (patientData) {
          setPatientRecordId(patientData.id);
          const { data } = await (externalSupabase as any)
            .from('appointments')
            .select(`
              id, 
              scheduled_date, 
              scheduled_time, 
              status,
              doctor:doctor_id (
                id,
                specialization,
                user:user_id (full_name)
              )
            `)
            .eq('patient_id', patientData.id)
            .order('scheduled_date', { ascending: false });

          if (data) setAppointments(data as any);
        }

        // Fetch Doctors
        const { data: docs } = await (externalSupabase as any)
          .from('doctors')
          .select(`
            id,
            specialization,
            user:user_id (full_name)
          `);
        if (docs) setDoctors(docs);

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [db_id]);

  const handleBooking = async () => {
    if (!selectedDoctorId || !selectedDate || !selectedTime || !patientRecordId) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (externalSupabase as any)
        .from('appointments')
        .insert({
          patient_id: patientRecordId,
          doctor_id: selectedDoctorId,
          scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
          scheduled_time: selectedTime,
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success("Appointment booked successfully!");
      setIsBookingOpen(false);

      // Refresh appointments
      const { data } = await (externalSupabase as any)
        .from('appointments')
        .select(`
          id, scheduled_date, scheduled_time, status,
          doctor:doctor_id (id, specialization, user:user_id (full_name))
        `)
        .eq('patient_id', patientRecordId)
        .order('scheduled_date', { ascending: false });
      if (data) setAppointments(data as any);

    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      confirmed: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      completed: 'bg-green-500/10 text-green-400 border-green-500/20',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return <Badge className={colors[status] || 'bg-gray-500/10 text-gray-400'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48 bg-[#1A1F35]" />
          <Skeleton className="h-10 w-32 bg-[#1A1F35]" />
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-[#1A1F35]" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">My Appointments</h1>
          <p className="text-gray-400 text-sm">View and manage your scheduled hospital visits</p>
        </div>
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl">
              <Plus size={18} className="mr-2" /> Book New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#0C0F1A] border-[#1A1F35] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Book Appointment</DialogTitle>
              <DialogDescription className="text-gray-400">
                Choose your doctor and preferred time slot.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-400">Select Doctor</label>
                <Select onValueChange={setSelectedDoctorId} value={selectedDoctorId}>
                  <SelectTrigger className="bg-[#1A1F35] border-[#2A2F45] text-white">
                    <SelectValue placeholder="Select a specialist" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1F35] border-[#2A2F45] text-white">
                    {doctors.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.user?.full_name} ({doc.specialization})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-400">Select Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-[#1A1F35] border-[#2A2F45] text-white hover:bg-[#2A2F45]",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#1A1F35] border-[#2A2F45]" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="bg-[#1A1F35] text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-400">Time Slot</label>
                <Select onValueChange={setSelectedTime} value={selectedTime}>
                  <SelectTrigger className="bg-[#1A1F35] border-[#2A2F45] text-white">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1F35] border-[#2A2F45] text-white">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleBooking}
                disabled={isSubmitting}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isSubmitting ? "Booking..." : "Confirm Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-20 bg-[#0C0F1A] border border-[#1A1F35] rounded-2xl">
            <CalendarIcon className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-400">No appointments found.</p>
          </div>
        ) : (
          appointments.map((appt) => (
            <div key={appt.id} className="rounded-2xl border p-5 bg-[#0C0F1A] border-[#1A1F35] hover:border-teal-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Dr. {appt.doctor?.user?.full_name || 'Medical Practitioner'}</h3>
                  <p className="text-sm text-teal-400">{appt.doctor?.specialization || 'Department'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date & Time</span>
                  <div className="flex items-center gap-3 text-sm text-white">
                    <span className="flex items-center gap-1.5"><CalendarIcon size={14} className="text-gray-500" /> {format(new Date(appt.scheduled_date), 'MMM d, yyyy')}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-500" /> {appt.scheduled_time}</span>
                  </div>
                </div>
                <div className="flex flex-col min-w-[100px]">
                  <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</span>
                  {getStatusBadge(appt.status)}
                </div>
                <button className="p-2 rounded-xl bg-[#1A1F35] text-gray-400 hover:text-white transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientAppointments;
