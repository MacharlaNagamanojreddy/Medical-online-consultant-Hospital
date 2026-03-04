import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'patient' | 'doctor' | 'admin' | 'family';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  db_id: string | null;
  role: AppRole | null;
  profile: { full_name: string | null } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [db_id, setDbId] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string, email?: string) => {
    try {
      if (!email) return;

      // Query by email instead of ID to handle pre-seeded data mismatches
      const { data: userData } = await (supabase
        .from('users' as any)
        .select('id, role, full_name')
        .eq('email', email)
        .maybeSingle() as any);

      if (userData) {
        setDbId((userData as any).id);
        setRole((userData as any).role as AppRole);
        setProfile({ full_name: (userData as any).full_name });
      } else {
        // Fallback for demo accounts if record is missing or RPC fails
        console.log('User record not found, using email-based fallback for role');
        if (email.includes('patient')) setRole('patient');
        else if (email.includes('doctor')) setRole('doctor');
        else if (email.includes('admin')) setRole('admin');
        else if (email.includes('family')) setRole('family');
        setProfile({ full_name: email.split('@')[0] });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      // Even on error, try to set a fallback role if it's a demo account
      if (email) {
        if (email.includes('patient')) setRole('patient');
        else if (email.includes('doctor')) setRole('doctor');
        else if (email.includes('admin')) setRole('admin');
        else if (email.includes('family')) setRole('family');
        setProfile({ full_name: email.split('@')[0] });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user.id, session.user.email);
        } else {
          setDbId(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setDbId(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, db_id, role, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
