import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { role, profile, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-lg p-8 text-center">
        <div className="text-4xl mb-4">🧠</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {role?.charAt(0).toUpperCase()}{role?.slice(1)} Dashboard
        </h1>
        <p className="text-muted-foreground mb-1">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Role: <span className="text-primary font-medium">{role}</span>
        </p>
        <Button onClick={signOut} variant="outline" className="border-border text-muted-foreground hover:text-foreground">
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
