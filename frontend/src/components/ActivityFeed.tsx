import React from 'react';
import { motion } from 'framer-motion';
import { GitBranchIcon, FileCodeIcon, ShieldIcon, LoaderIcon, WifiOffIcon } from 'lucide-react';
import type { ScanHistoryItem } from '../services/api';

interface Props {
  items: ScanHistoryItem[];
  loading: boolean;
  offline: boolean;
}

function formatTimestamp(ts: string | undefined) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSeverityColor(sev: string) {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'ERROR' || s === 'HIGH') return 'text-cyber-red';
  if (s === 'MEDIUM' || s === 'WARNING') return 'text-yellow-400';
  return 'text-blue-400';
}

export function ActivityFeed({ items, loading, offline }: Props) {
  return (
    <div className="bg-cyber-surface border border-cyber-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-cyber-text mb-1">Scan Activity</h3>
        <p className="text-sm text-cyber-text-muted">Recent security scan events</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <LoaderIcon className="w-5 h-5 animate-spin text-cyber-red" />
          <span className="text-sm text-cyber-text-muted">Loading activity...</span>
        </div>
      )}

      {offline && !loading && (
        <div className="flex items-center gap-3 py-4 text-yellow-400">
          <WifiOffIcon className="w-4 h-4 shrink-0" />
          <span className="text-sm">Backend offline — no activity data</span>
        </div>
      )}

      {!loading && !offline && items.length === 0 && (
        <p className="text-sm text-cyber-text-muted py-4 text-center">
          No scan activity yet. Run a scan to see events here.
        </p>
      )}

      {!loading && !offline && items.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto" role="feed" aria-label="Scan activity feed">
          {items.slice(0, 20).map((item, index) => {
            const isIac = item.metadata?.type === 'iac';
            const Icon = isIac ? FileCodeIcon : GitBranchIcon;
            const sev = item.metadata?.severity || 'INFO';
            const repo = item.metadata?.repo || 'Unknown repo';
            const ts = formatTimestamp(item.metadata?.scanned_at || item.created_at);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.3 }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-cyber-surface-light transition-colors"
                role="article"
              >
                <div className={`flex-shrink-0 mt-0.5 ${getSeverityColor(sev)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cyber-text leading-snug">
                    <span className="capitalize">{isIac ? 'IaC' : 'Code'}</span> scan completed —{' '}
                    <span className="font-mono text-cyber-red">{repo}</span>
                  </p>
                  <p className="text-xs text-cyber-text-muted mt-0.5 truncate">
                    {item.metadata?.rule_id || item.content.slice(0, 60)}
                  </p>
                  <time className="text-xs text-cyber-text-muted font-mono mt-0.5 block">{ts}</time>
                </div>
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${getSeverityColor(sev)} bg-current/10`}>
                  {sev}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
