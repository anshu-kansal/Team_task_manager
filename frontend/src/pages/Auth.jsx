import { useState } from 'react';
import { forgotPassword, login, resetPassword, signup } from '../api';
import { useToast } from '../components/Toast';

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
      onLogin(response.data.user, response.data.token);
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
      onLogin(response.data.user, response.data.token);
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

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-hero">
          <span className="hero-chip">Secure team workflows</span>
          <h1>Team Task Manager</h1>
          <p>Join your team with a modern, secure workspace for tracking projects, tasks, and collaboration.</p>
          <div className="feature-list">
            <div className="feature-item">Fast onboarding with secure login</div>
            <div className="feature-item">Clear project prioritization</div>
            <div className="feature-item">Real-time task visibility</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <div>
              <h1>
                {mode === 'login' && 'Sign in to your account'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'forgot' && 'Reset your password'}
                {mode === 'reset' && 'Enter your reset code'}
              </h1>
              <p className="hint">
                {mode === 'login' && 'Enter your email and password to access your workspace.'}
                {mode === 'signup' && 'Provide your details to set up secure team access.'}
                {mode === 'forgot' && 'Enter your email and we will send a reset code.'}
                {mode === 'reset' && 'Enter the reset code and choose a new password.'}
              </p>
            </div>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => handleModeChange('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => handleModeChange('signup')}
            >
              Signup
            </button>
          </div>

          <form
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : mode === 'forgot' ? handleForgotPassword : handleResetPassword}
          >
            {mode === 'signup' && (
              <>
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  autoFocus
                />

                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+1 555 123 4567"
                  required
                />
              </>
            )}

            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus={mode !== 'signup'}
            />

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <>
                {mode === 'reset' && (
                  <>
                    <label>Reset Code</label>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter reset code"
                      required
                    />
                  </>
                )}

                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </>
            )}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading
                ? 'Processing…'
                : mode === 'login'
                  ? 'Login'
                  : mode === 'signup'
                    ? 'Signup'
                    : mode === 'forgot'
                      ? 'Send reset code'
                      : 'Reset password'}
            </button>
          </form>

          <div className="auth-footer">
            {mode === 'login' && (
              <button type="button" className="btn-secondary link-button" onClick={() => handleModeChange('forgot')}>
                Forgot password?
              </button>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <button type="button" className="btn-secondary link-button" onClick={() => handleModeChange('login')}>
                Back to login
              </button>
            )}
            <p className="hint">
              {mode === 'login' && 'New to Team Task Manager? Create an account to manage tasks with your team.'}
              {mode === 'signup' && 'Already registered? Switch to login to access your workspace.'}
              {mode === 'forgot' && 'Use your registered email to receive a reset code.'}
              {mode === 'reset' && 'Enter your reset code to choose a new password.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
