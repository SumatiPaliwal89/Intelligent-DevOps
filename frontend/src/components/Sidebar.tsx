import React from 'react';
import { HomeIcon, GitBranchIcon, FileTextIcon, ShieldIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type Page = 'dashboard' | 'scan' | 'reports' | 'scanning' | 'vulnerabilities';

interface NavItem {
  icon: typeof HomeIcon;
  label: string;
  page: Page;
}

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: NavItem[] = [
  { icon: HomeIcon,       label: 'Dashboard',    page: 'dashboard' },
  { icon: GitBranchIcon,  label: 'Scan Repo',    page: 'scan' },
  { icon: ShieldIcon,     label: 'Findings',     page: 'vulnerabilities' },
  { icon: FileTextIcon,   label: 'Reports',      page: 'reports' },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-52 bg-cyber-charcoal border-r border-cyber-border z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-cyber-border">
        <div className="w-8 h-8 bg-cyber-red/10 border border-cyber-red/30 rounded-lg flex items-center justify-center shadow-red-glow flex-shrink-0">
          <ShieldIcon className="w-4 h-4 text-cyber-red" />
        </div>
        <div>
          <p className="text-sm font-bold text-cyber-text leading-none">DevSecOps</p>
          <p className="text-xs text-cyber-text-muted mt-0.5">Security Scanner</p>
        </div>
      </div>

      <nav className="flex flex-col py-4 px-3 space-y-1" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.page === currentPage;
          return (
            <motion.button
              key={item.label}
              onClick={() => onNavigate(item.page)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-cyber-red/15 text-cyber-red border border-cyber-red/30 shadow-red-glow'
                  : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-surface'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyber-red rounded-r"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
}
