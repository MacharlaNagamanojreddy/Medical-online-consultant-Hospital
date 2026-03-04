import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Menu, X, Bell, Home, MessageSquare, Calendar, Pill, Users, Bed, CreditCard, Heart, Activity, FileText, Settings, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AppRole = 'patient' | 'doctor' | 'admin' | 'family';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navConfig: Record<AppRole, NavItem[]> = {
  patient: [
    { icon: <Home size={18} />, label: 'Dashboard', path: '/patient/dashboard' },
    { icon: <MessageSquare size={18} />, label: 'Chat with AI', path: '/patient/chat' },
    { icon: <Calendar size={18} />, label: 'Appointments', path: '/patient/appointments' },
    { icon: <Pill size={18} />, label: 'Medications', path: '/patient/medications' },
    { icon: <Bell size={18} />, label: 'Notifications', path: '/patient/notifications' },
  ],
  doctor: [
    { icon: <Home size={18} />, label: 'Dashboard', path: '/doctor/dashboard' },
    { icon: <FileText size={18} />, label: 'Soap Notes', path: '/doctor/soap-notes' },
    { icon: <Users size={18} />, label: 'My Patients', path: '/doctor/patients' },
    { icon: <Calendar size={18} />, label: 'Schedule', path: '/doctor/schedule' },
  ],
  admin: [
    { icon: <Activity size={18} />, label: 'Operations', path: '/admin/dashboard' },
    { icon: <Bed size={18} />, label: 'Bed Management', path: '/admin/beds' },
    { icon: <Users size={18} />, label: 'Staff Schedule', path: '/admin/staff' },
    { icon: <CreditCard size={18} />, label: 'Billing', path: '/admin/billing' },
  ],
  family: [
    { icon: <Heart size={18} />, label: 'Health Status', path: '/family/dashboard' },
    { icon: <Calendar size={18} />, label: 'Visit Schedule', path: '/family/visits' },
    { icon: <MessageSquare size={18} />, label: 'Chat with AI', path: '/family/chat' },
    { icon: <Bell size={18} />, label: 'Notifications', path: '/family/notifications' },
  ],
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { role, profile, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const items = role ? navConfig[role] : [];
  const displayName = profile?.full_name || 'User';
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

  const sidebar = (
    <aside className="flex h-full w-64 flex-col" style={{ background: '#0C0F1A' }}>
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Shield className="text-white" size={20} />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white block leading-none">MedFlow</span>
          <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Intelligent Care</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-white/10">
        <p className="text-sm font-semibold text-white truncate">{displayName}</p>
        <Badge className="mt-1 bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-wider">
          {roleLabel}
        </Badge>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-l-[3px] border-[#14B8A6] text-[#14B8A6] bg-white/5'
                    : 'border-l-[3px] border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  active ? "bg-teal-500/20 text-teal-400" : "text-gray-500 group-hover:text-gray-300"
                )}>
                  {item.icon}
                </div>
                <span className="font-semibold tracking-wide">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Sign out */}
      <div className="px-3 pb-5 pt-2 border-t border-white/10">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#060810' }}>
      {/* Desktop sidebar */}
      {!isMobile && sidebar}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="h-full">{sidebar}</div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* TopBar */}
        <header className="flex h-16 items-center justify-between border-b border-white/5 px-6 sticky top-0 z-30 backdrop-blur-md bg-[#060810]/50">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
              Central {roleLabel} Node
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/5 rounded-xl">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full border-2 border-[#060810]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-[#0C0F1A] border-[#1A1F35] p-0 overflow-hidden shadow-2xl" align="end">
                <div className="p-4 border-b border-[#1A1F35] bg-teal-500/5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-teal-500">Live Alerts</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                    <p className="text-xs font-bold text-white mb-1 group-hover:text-teal-400">System Ready</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">MedFlow AI core services are fully operational. Advanced reasoning enabled.</p>
                  </div>
                  <div className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                    <p className="text-xs font-bold text-white mb-1 group-hover:text-teal-400">Day 5 Active</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Finalizing Agentic integration. Predictive models initialized.</p>
                  </div>
                </div>
                <div className="p-3 text-center bg-[#070912]">
                  <button className="text-[10px] font-bold text-gray-600 hover:text-teal-500 uppercase tracking-widest">Clear All Notifications</button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10 ml-2">
              <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 font-bold text-xs ring-2 ring-teal-500/5">
                {displayName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto scrollbar-hide py-6 px-4 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
