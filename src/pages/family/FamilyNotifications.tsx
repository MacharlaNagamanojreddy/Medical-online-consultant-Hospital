import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as externalSupabase } from '@/integrations/supabase/client';
import { Bell, Heart, Calendar, ShieldAlert, CheckCircle2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface FamilyNotification {
  id: string;
  title: string;
  message: string;
  type: 'health_alert' | 'appointment' | 'system' | 'permission';
  is_read: boolean;
  created_at: string;
}

const FamilyNotifications = () => {
  const { db_id } = useAuth();
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db_id) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data } = await (externalSupabase as any)
          .from('notifications')
          .select('*')
          .eq('recipient_id', db_id)
          .order('created_at', { ascending: false });

        if (data) setNotifications(data);
      } catch (err) {
        console.error('Error in fetchNotifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [db_id]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'health_alert': return <Heart className="text-red-400" size={20} />;
      case 'appointment': return <Calendar className="text-blue-400" size={20} />;
      case 'permission': return <ShieldAlert className="text-yellow-500" size={20} />;
      default: return <Bell className="text-teal-400" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 mb-6 bg-[#1A1F35]" />
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-[#1A1F35]" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#060810', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">Care Center Notifications</h1>
          <p className="text-gray-400 text-sm">Vital updates and status reports for your family members</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs text-teal-500 hover:text-teal-400 font-medium px-4 py-2 rounded-xl bg-teal-500/5 border border-teal-500/10 transition-all">
            Mark items as read
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-[#0C0F1A] border border-[#1A1F35] rounded-2xl">
            <Bell className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-400">Your notification center is clear.</p>
          </div>
        ) : (
          notifications.map((note) => (
            <div key={note.id} className={`rounded-2xl border p-4 transition-all flex items-start gap-4 ${note.is_read ? 'bg-[#1A1F35]/10 border-[#1A1F35] opacity-60' : 'bg-[#0C0F1A] border-teal-500/20 shadow-lg'}`}>
              <div className={`p-3 rounded-xl shrink-0 ${note.is_read ? 'bg-gray-800' : 'bg-teal-500/10 border border-teal-500/10'}`}>
                {getNotificationIcon(note.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`text-sm font-bold tracking-tight ${note.is_read ? 'text-gray-400' : 'text-white'}`}>{note.title}</h3>
                  <span className="text-[10px] text-gray-500">
                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${note.is_read ? 'text-gray-500' : 'text-gray-400'}`}>
                  {note.message}
                </p>

                {!note.is_read && (
                  <div className="flex items-center gap-2 mt-3 cursor-pointer group/action">
                    <span className="text-[10px] text-teal-500 font-bold group-hover/action:underline">REPLY</span>
                    <CheckCircle2 size={10} className="text-teal-500" />
                  </div>
                )}
              </div>
              {!note.is_read && (
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0 animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FamilyNotifications;
