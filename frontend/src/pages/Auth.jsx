import { useState } from 'react';
import { forgotPassword, login, resetPassword, signup } from '../api';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { CheckCircle2, ShieldCheck, Mail, Lock, Phone, User, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setMobile('');
    setToken('');
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetFields();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await login({ email, password });
      onLogin(response.data.user, response.data.token, response.data.refreshToken);
    } catch (error) {
      toast(error.response?.data?.error || 'Login failed. Please verify your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await signup({ name, email, password, mobile });
      onLogin(response.data.user, response.data.token, response.data.refreshToken);
    } catch (error) {
      toast(error.response?.data?.error || 'Signup failed. Please check your details and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast('Please enter your email address to receive reset instructions.', 'info');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword({ email });
      toast(response.data.message || 'Password reset request sent.', 'success');
      if (response.data.resetToken) {
        setToken(response.data.resetToken);
        toast('Reset code generated. Use it below to set a new password.', 'info');
      }
      setMode('reset');
    } catch (error) {
      toast(error.response?.data?.error || 'Unable to send reset request. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!token || !password) {
      toast('Enter the reset code and a new password.', 'info');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({ token, password });
      toast(response.data.message || 'Password updated successfully.', 'success');
      setMode('login');
      setPassword('');
      setToken('');
    } catch (error) {
      toast(error.response?.data?.error || 'Unable to reset password. Check your token and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: '', color: 'bg-gray-200 w-0' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    
    if (score <= 1) return { score, text: 'Weak', color: 'bg-red-500 w-1/4', textClass: 'text-red-500' };
    if (score === 2) return { score, text: 'Fair', color: 'bg-amber-500 w-2/4', textClass: 'text-amber-500' };
    if (score === 3) return { score, text: 'Good', color: 'bg-blue-500 w-3/4', textClass: 'text-blue-500' };
    return { score, text: 'Strong', color: 'bg-green-500 w-full', textClass: 'text-green-500' };
  };

  const pwdStrength = getPasswordStrength(password);

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Hero section */}
      <div className="hidden lg:flex flex-1 flex-col justify-center bg-gray-900 p-12 text-white relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/30 via-indigo-950/20 to-purple-800/25" />
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary-500/10 blur-[100px] animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px] animate-pulse-soft" />

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm tracking-wide uppercase">
            🚀 Version 2.0 Released
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight leading-tight">
            Collaborative Task Management Simplified
          </h1>
          <p className="mb-10 text-sm text-gray-300/90 leading-relaxed">
            Unleash your team's throughput. TaskMaster provides a professional workspace, Kanban board pipelines, real-time sync, and progress statistics for corporate productivity workflows.
          </p>
          
          <div className="space-y-4">
            {[
              'Secure SSO authentication & encryption standard',
              'Workspace prioritization pipelines (Kanban Flow)',
              'Individual setup and tailored templates'
            ].map((feature, i) => (
              <div key={i} className="flex items-center space-x-3 text-sm text-gray-300">
                <CheckCircle2 className="h-5 w-5 text-primary-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-dark-bg p-6 animate-fade-in">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            {/* Logo */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-primary-700 text-white shadow-md mx-auto mb-4">
              <ShieldCheck size={20} />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {mode === 'login' && 'Welcome to TaskMaster'}
              {mode === 'signup' && 'Create your workspace'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'reset' && 'Set new password'}
            </h2>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {mode === 'login' && 'Enter your corporate credentials to sign in'}
              {mode === 'signup' && 'Complete details below to start collaborative flows'}
              {mode === 'forgot' && 'Enter your email below to request reset code'}
              {mode === 'reset' && 'Fill in code and choose secure password'}
            </p>
          </div>

          <Card className="border-none shadow-xl dark:bg-dark-card">
            <CardContent className="pt-6">
              {(mode === 'login' || mode === 'signup') && (
                <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 dark:bg-surface-800 p-1">
                  <button
                    onClick={() => handleModeChange('login')}
                    className={cn(
                      "rounded-md py-1.5 text-xs font-semibold transition-all duration-150",
                      mode === 'login'
                        ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    )}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleModeChange('signup')}
                    className={cn(
                      "rounded-md py-1.5 text-xs font-semibold transition-all duration-150",
                      mode === 'signup'
                        ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    )}
                  >
                    Register
                  </button>
                </div>
              )}

              <form 
                className="space-y-4"
                onSubmit={
                  mode === 'login' 
                    ? handleLogin 
                    : mode === 'signup' 
                      ? handleSignup 
                      : mode === 'forgot' 
                        ? handleForgotPassword 
                        : handleResetPassword
                }
              >
                {mode === 'signup' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                        <User size={13} /> Full Name
                      </label>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                        <Phone size={13} /> Mobile Number
                      </label>
                      <Input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="+91 99999 99999"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                    <Mail size={13} /> Corporate Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    autoFocus={mode !== 'signup'}
                  />
                </div>

                {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
                  <>
                    {mode === 'reset' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Reset Code</label>
                        <Input
                          type="text"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="Enter reset code"
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                          <Lock size={13} /> Password
                        </label>
                        {mode === 'login' && (
                          <button 
                            type="button" 
                            className="text-xs font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
                            onClick={() => handleModeChange('forgot')}
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      
                      {/* Password strength indicator (Signup mode only) */}
                      {mode === 'signup' && password && (
                        <div className="mt-2 space-y-1 animate-fade-in">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span className="text-surface-500">Security Strength:</span>
                            <span className={pwdStrength.textClass}>{pwdStrength.text}</span>
                          </div>
                          <div className="h-1 w-full bg-gray-200 dark:bg-surface-800 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-300 rounded-full", pwdStrength.color)} />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full mt-2" loading={loading}>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Get Started Free'}
                  {mode === 'forgot' && 'Request Reset'}
                  {mode === 'reset' && 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {(mode === 'forgot' || mode === 'reset') && (
            <div className="text-center">
              <button 
                type="button" 
                onClick={() => handleModeChange('login')}
                className="inline-flex items-center gap-1 text-xs font-bold text-surface-600 hover:text-gray-900 dark:text-surface-400 dark:hover:text-white"
              >
                <ArrowLeft size={13} /> Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
