import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { Shield } from "lucide-react";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

// Patient pages
const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard"));
const PatientChat = lazy(() => import("./pages/patient/PatientChat"));
const PatientAppointments = lazy(() => import("./pages/patient/PatientAppointments"));
const PatientMedications = lazy(() => import("./pages/patient/PatientMedications"));
const PatientNotifications = lazy(() => import("./pages/patient/PatientNotifications"));

// Doctor pages
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorSoapNotes = lazy(() => import("./pages/doctor/DoctorSoapNotes"));
const DoctorPatients = lazy(() => import("./pages/doctor/DoctorPatients"));
const DoctorSchedule = lazy(() => import("./pages/doctor/DoctorSchedule"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBeds = lazy(() => import("./pages/admin/AdminBeds"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));

// Family pages
const FamilyDashboard = lazy(() => import("./pages/family/FamilyDashboard"));
const FamilyVisits = lazy(() => import("./pages/family/FamilyVisits"));
const FamilyChat = lazy(() => import("./pages/family/FamilyChat"));
const FamilyNotifications = lazy(() => import("./pages/family/FamilyNotifications"));

const queryClient = new QueryClient();

const MedicalPulseLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#060810]" style={{ perspective: '1000px' }}>
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-4 border-teal-500/20 animate-ping absolute inset-0" />
      <div className="w-16 h-16 rounded-full border-4 border-teal-500 flex items-center justify-center relative z-10 animate-pulse">
        <Shield className="text-teal-400" size={32} />
      </div>
      <div className="mt-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-500 animate-pulse">Initializing MedFlow Core</p>
        <p className="text-[10px] text-gray-600 mt-2 font-bold uppercase tracking-widest">Day 5: Agentic Systems Active</p>
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <MedicalPulseLoader />;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const RoleRedirect = () => {
  const { session, role, loading } = useAuth();
  if (loading) return <MedicalPulseLoader />;
  if (!session) return <Login />;
  if (role) return <Navigate to={`/${role}/dashboard`} replace />;
  return <MedicalPulseLoader />;
};

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DashboardLayout>
      <Suspense fallback={<MedicalPulseLoader />}>{children}</Suspense>
    </DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />

            {/* Patient */}
            <Route path="/patient/dashboard" element={<ProtectedLayout><PatientDashboard /></ProtectedLayout>} />
            <Route path="/patient/chat" element={<ProtectedLayout><PatientChat /></ProtectedLayout>} />
            <Route path="/patient/appointments" element={<ProtectedLayout><PatientAppointments /></ProtectedLayout>} />
            <Route path="/patient/medications" element={<ProtectedLayout><PatientMedications /></ProtectedLayout>} />
            <Route path="/patient/notifications" element={<ProtectedLayout><PatientNotifications /></ProtectedLayout>} />

            {/* Doctor */}
            <Route path="/doctor/dashboard" element={<ProtectedLayout><DoctorDashboard /></ProtectedLayout>} />
            <Route path="/doctor/soap-notes" element={<ProtectedLayout><DoctorSoapNotes /></ProtectedLayout>} />
            <Route path="/doctor/patients" element={<ProtectedLayout><DoctorPatients /></ProtectedLayout>} />
            <Route path="/doctor/schedule" element={<ProtectedLayout><DoctorSchedule /></ProtectedLayout>} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
            <Route path="/admin/beds" element={<ProtectedLayout><AdminBeds /></ProtectedLayout>} />
            <Route path="/admin/staff" element={<ProtectedLayout><AdminStaff /></ProtectedLayout>} />
            <Route path="/admin/billing" element={<ProtectedLayout><AdminBilling /></ProtectedLayout>} />

            {/* Family */}
            <Route path="/family/dashboard" element={<ProtectedLayout><FamilyDashboard /></ProtectedLayout>} />
            <Route path="/family/visits" element={<ProtectedLayout><FamilyVisits /></ProtectedLayout>} />
            <Route path="/family/chat" element={<ProtectedLayout><FamilyChat /></ProtectedLayout>} />
            <Route path="/family/notifications" element={<ProtectedLayout><FamilyNotifications /></ProtectedLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
