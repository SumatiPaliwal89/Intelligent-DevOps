import React from 'react';
import { UserIcon, LogOutIcon, ShieldCheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, type User } from '../lib/supabase';

interface TopNavProps {
  user?: User | null;
}

export function TopNav({ user }: TopNavProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const displayName = user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'User';

  return (
    <header className="fixed top-0 left-52 right-0 h-16 bg-cyber-charcoal border-b border-cyber-border z-30">
      <div className="flex items-center justify-between h-full px-6">
        {/* Page title area — left side */}
        <div className="flex items-center gap-2 text-cyber-text-muted">
          <ShieldCheckIcon className="w-4 h-4 text-cyber-red" aria-hidden="true" />
          <span className="text-sm">AI-Powered Security Intelligence</span>
        </div>

        {/* Right: user info + logout */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyber-red/10 border border-cyber-red/30 rounded-lg flex items-center justify-center shadow-red-glow">
            <UserIcon className="w-4 h-4 text-cyber-red" aria-hidden="true" />
          </div>
          {user && (
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-cyber-text leading-none">{displayName}</p>
              <p className="text-xs text-cyber-text-muted mt-0.5">{user.email}</p>
            </div>
          )}
          {user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2 text-cyber-text-muted hover:text-cyber-red transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOutIcon className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}
