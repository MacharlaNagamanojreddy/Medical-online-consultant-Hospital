import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, User } from 'lucide-react';

const demoAccounts = [
  { label: 'Patient Demo', email: 'patient@demo.com', password: 'demo1234' },
  { label: 'Doctor Demo', email: 'doctor@demo.com', password: 'demo1234' },
  { label: 'Admin Demo', email: 'admin@demo.com', password: 'demo1234' },
  { label: 'Family Demo', email: 'family@demo.com', password: 'demo1234' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success('Signed in successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, hsl(174 50% 85%) 0%, hsl(174 60% 75%) 30%, hsl(174 72% 40%) 100%)' }}
    >
      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Large circle bottom center */}
        <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-[50%] opacity-20"
          style={{ background: 'radial-gradient(ellipse, hsl(174 72% 60% / 0.5), transparent 70%)' }} />
        {/* Floating circles */}
        <div className="absolute left-[5%] top-[30%] h-40 w-40 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm" />
        <div className="absolute right-[5%] top-[40%] h-48 w-48 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm" />
        <div className="absolute left-[45%] top-[5%] h-20 w-20 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm" />
        {/* Heartbeat line */}
        <svg className="absolute bottom-[20%] left-0 w-full h-20 opacity-30" viewBox="0 0 1200 80" fill="none">
          <polyline points="0,40 300,40 350,40 370,10 390,70 410,20 430,50 450,40 1200,40"
            stroke="white" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* App name at top */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <span className="text-3xl">🧠</span>
        <h1 className="text-2xl font-bold font-display tracking-tight text-white drop-shadow-md">MedFlow AI</h1>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-3xl border border-white/30 p-8 sm:p-10"
        style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
      >
        {/* Medical cross icon */}
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-3xl font-bold">✚</span>
          </div>
        </div>

        <h2 className="text-center text-3xl font-display font-semibold text-foreground mb-8">Welcome Back!</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-primary">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
                required
                className="w-full border-0 border-b-2 border-border bg-transparent py-3 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
              <User size={18} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-primary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full border-0 border-b-2 border-border bg-transparent py-3 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="text-right pt-1">
              <a href="#" className="text-sm font-semibold text-primary hover:underline">Forgot Password ?</a>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base tracking-wide uppercase"
          >
            {isLoading ? 'Signing in...' : 'SIGN IN'}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Demo buttons */}
        <div>
          <p className="text-xs text-muted-foreground text-center mb-3">Quick Demo Access</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((demo) => (
              <button
                key={demo.label}
                type="button"
                onClick={() => fillDemo(demo.email, demo.password)}
                className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border border-border text-muted-foreground hover:border-primary hover:text-primary cursor-pointer bg-white"
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account ? <a href="#" className="font-semibold text-primary hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
