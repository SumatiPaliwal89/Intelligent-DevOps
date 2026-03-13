import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldIcon, EyeIcon, EyeOffIcon, LoaderIcon, AlertCircleIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgot';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => { setError(null); setSuccessMsg(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg('Password reset email sent! Check your inbox.');
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Account created! Check your email to confirm, then log in.');
        setMode('login');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // auth state updates via useAuth hook — no manual callback needed
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modeConfig = {
    login:  { title: 'Sign In',        subtitle: 'Access your security dashboard',      btn: 'Sign In',          link: "Don't have an account?", linkMode: 'signup' as AuthMode },
    signup: { title: 'Create Account', subtitle: 'Start scanning for vulnerabilities',  btn: 'Create Account',   link: 'Already have an account?', linkMode: 'login' as AuthMode },
    forgot: { title: 'Reset Password', subtitle: "We'll send you a reset link",         btn: 'Send Reset Email', link: 'Back to login', linkMode: 'login' as AuthMode },
  };
  const cfg = modeConfig[mode];

  return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-background opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyber-red/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-cyber-red/10 border border-cyber-red/30 rounded-2xl mb-4 shadow-red-glow"
          >
            <ShieldIcon className="w-8 h-8 text-cyber-red" />
          </motion.div>
          <h1 className="text-2xl font-bold text-cyber-text">DevSecOps Scanner</h1>
          <p className="text-cyber-text-muted text-sm mt-1">AI-Powered Security Intelligence</p>
        </div>

        <div className="bg-cyber-surface border border-cyber-border rounded-2xl p-8 shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-cyber-text mb-1">{cfg.title}</h2>
              <p className="text-cyber-text-muted text-sm mb-6">{cfg.subtitle}</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4 text-sm text-red-400"
                >
                  <AlertCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4 text-sm text-green-400"
                >
                  {successMsg}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-cyber-text-secondary mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-cyber-charcoal border border-cyber-border rounded-xl text-cyber-text placeholder-cyber-text-muted text-sm focus:outline-none focus:border-cyber-red focus:shadow-red-glow transition-all"
                  />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label className="block text-sm text-cyber-text-secondary mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                        minLength={mode === 'signup' ? 6 : undefined}
                        className="w-full px-4 py-3 pr-12 bg-cyber-charcoal border border-cyber-border rounded-xl text-cyber-text placeholder-cyber-text-muted text-sm focus:outline-none focus:border-cyber-red focus:shadow-red-glow transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-text-muted hover:text-cyber-text transition-colors"
                      >
                        {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); clearMessages(); }}
                        className="text-xs text-cyber-red hover:text-red-400 mt-1.5 float-right transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2 bg-cyber-red hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-red-glow"
                >
                  {loading ? (
                    <><LoaderIcon className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : cfg.btn}
                </motion.button>
              </form>

              <div className="mt-5 text-center text-sm text-cyber-text-muted">
                {cfg.link}{' '}
                <button
                  type="button"
                  onClick={() => { setMode(cfg.linkMode); clearMessages(); }}
                  className="text-cyber-red hover:text-red-400 font-medium transition-colors"
                >
                  {cfg.linkMode === 'login' ? 'Sign in' : cfg.linkMode === 'signup' ? 'Sign up' : 'Back'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-cyber-text-muted mt-6">
          Protected by Supabase Auth &middot; Powered by Gemini 2.5 Flash
        </p>
      </motion.div>
    </div>
  );
}
