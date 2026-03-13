import React, { useEffect, useState } from 'react';
import { RiskGauge } from '../components/RiskGauge';
import { AlertCard } from '../components/AlertCard';
import { SecurityGraph } from '../components/SecurityGraph';
import { ActivityFeed } from '../components/ActivityFeed';
import { motion } from 'framer-motion';
import {
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ActivityIcon,
  PlayIcon,
  GitBranchIcon,
  ClockIcon,
  WifiOffIcon,
  LoaderIcon,
} from 'lucide-react';
import { getScanHistory, type ScanHistoryItem } from '../services/api';

interface Props {
  onNavigate?: (page: 'scan') => void;
}

export function SecurityDashboard({ onNavigate }: Props) {
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setBackendOffline(false);

    getScanHistory(10)
      .then((data) => {
        if (!cancelled) {
          setRecentScans(data.history);
          setHistoryLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendOffline(true);
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Derive stats from live scan history
  const criticalCount = recentScans.filter((s) => {
    const sev = (s.metadata?.severity || '').toUpperCase();
    return sev === 'CRITICAL' || sev === 'ERROR';
  }).length;

  const mediumCount = recentScans.filter((s) => {
    const sev = (s.metadata?.severity || '').toUpperCase();
    return sev === 'MEDIUM' || sev === 'WARNING' || sev === 'HIGH';
  }).length;

  // Derive critical alerts from history items
  const criticalAlerts = recentScans
    .filter((s) => {
      const sev = (s.metadata?.severity || '').toUpperCase();
      return sev === 'CRITICAL' || sev === 'ERROR' || sev === 'HIGH';
    })
    .slice(0, 3)
    .map((s) => ({
      title: s.metadata?.rule_id || 'Security Finding',
      description: s.content?.slice(0, 100) || `Found in ${s.metadata?.repo || 'unknown repo'}`,
      timestamp: s.metadata?.scanned_at || s.created_at || new Date().toISOString(),
      type: 'critical' as const,
    }));

  // Unique repos scanned (as a proxy for "resolved" scans)
  const uniqueRepos = new Set(recentScans.map((s) => s.metadata?.repo).filter(Boolean)).size;

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen w-full bg-cyber-black grid-background">
      <div className="ml-52 pt-16">
        <div className="p-6 md:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-cyber-text mb-2">
                Security Dashboard
              </h1>
              <p className="text-cyber-text-secondary">
                Monitor your application security in real-time
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate?.('scan')}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-shadow">
              <PlayIcon className="w-5 h-5" aria-hidden="true" />
              <span>Start Scan</span>
            </motion.button>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="bg-gradient-to-br from-cyber-red/20 to-cyber-surface border border-cyber-red/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyber-red/20 rounded-lg">
                  <AlertTriangleIcon className="w-6 h-6 text-cyber-red" aria-hidden="true" />
                </div>
                <span className="text-3xl font-bold text-cyber-red">
                  {historyLoading ? '...' : criticalCount}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-cyber-text mb-1">Critical Issues</h3>
              <p className="text-xs text-cyber-text-muted">Requires immediate attention</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-gradient-to-br from-yellow-500/20 to-cyber-surface border border-yellow-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <AlertCircleIcon className="w-6 h-6 text-yellow-400" aria-hidden="true" />
                </div>
                <span className="text-3xl font-bold text-yellow-400">
                  {historyLoading ? '...' : mediumCount}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-cyber-text mb-1">Medium Risk</h3>
              <p className="text-xs text-cyber-text-muted">Should be addressed soon</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-gradient-to-br from-green-500/20 to-cyber-surface border border-green-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-green-400" aria-hidden="true" />
                </div>
                <span className="text-3xl font-bold text-green-400">
                  {historyLoading ? '...' : uniqueRepos}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-cyber-text mb-1">Repos Scanned</h3>
              <p className="text-xs text-cyber-text-muted">Unique repositories</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-gradient-to-br from-blue-500/20 to-cyber-surface border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <ActivityIcon className="w-6 h-6 text-blue-400" aria-hidden="true" />
                </div>
                <span className="text-3xl font-bold text-blue-400">
                  {historyLoading ? '...' : recentScans.length}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-cyber-text mb-1">Total Scans</h3>
              <p className="text-xs text-cyber-text-muted">From scan history</p>
            </motion.div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Gauge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="lg:row-span-2 bg-cyber-surface border border-cyber-border rounded-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-cyber-text mb-4">System Risk Level</h2>
                <RiskGauge score={
                  historyLoading || recentScans.length === 0
                    ? 0
                    : Math.min(100, Math.round((criticalCount * 20 + mediumCount * 5) / Math.max(1, recentScans.length) * 10))
                } />
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-cyber-text-muted">Active Threats</span>
                    <span className="text-cyber-red font-semibold">
                      {historyLoading ? '...' : criticalCount + mediumCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-cyber-text-muted">Total Findings</span>
                    <span className="text-green-400 font-semibold">
                      {historyLoading ? '...' : recentScans.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-cyber-text-muted">System Status</span>
                    <span className="text-cyber-text font-semibold">
                      {backendOffline ? 'OFFLINE' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Critical Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-cyber-text">Critical Alerts</h2>
              </div>
              <div className="space-y-4">
                {criticalAlerts.map((alert, index) => (
                  <AlertCard key={index} {...alert} index={index} />
                ))}
              </div>
            </motion.div>

            {/* Security Graph */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="lg:col-span-2">
              <SecurityGraph items={recentScans} />
            </motion.div>
          </div>

          {/* Recent Scans Section — from live API */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-6 bg-cyber-surface border border-cyber-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-cyber-text">Recent Scans</h2>
              <span className="text-xs text-cyber-text-muted">Live from backend</span>
            </div>

            {/* Backend offline warning */}
            {backendOffline && (
              <div className="flex items-center space-x-3 p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <WifiOffIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-yellow-400">Backend offline</p>
                  <p className="text-xs text-cyber-text-muted">
                    Start the backend server on port 8000 to see live scan history.
                  </p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {historyLoading && !backendOffline && (
              <div className="flex items-center justify-center py-8 space-x-3">
                <LoaderIcon className="w-5 h-5 animate-spin text-cyber-red" aria-hidden="true" />
                <span className="text-cyber-text-secondary text-sm">Loading scan history...</span>
              </div>
            )}

            {/* Scan history table */}
            {!historyLoading && !backendOffline && recentScans.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-cyber-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-cyber-text-muted uppercase">
                        Repository
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-cyber-text-muted uppercase">
                        Scan Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-cyber-text-muted uppercase">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-cyber-text-muted uppercase">
                        Scanned At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyber-border">
                    {recentScans.map((scan) => (
                      <tr
                        key={scan.id}
                        className="hover:bg-cyber-surface-light transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <GitBranchIcon
                              className="w-4 h-4 text-cyber-text-muted"
                              aria-hidden="true"
                            />
                            <span className="text-sm text-cyber-text font-mono">
                              {scan.metadata?.repo || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-cyber-text-secondary capitalize">
                            {scan.metadata?.type || 'code'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              scan.metadata?.severity === 'ERROR' ||
                              scan.metadata?.severity === 'HIGH' ||
                              scan.metadata?.severity === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400'
                                : scan.metadata?.severity === 'WARNING' ||
                                  scan.metadata?.severity === 'MEDIUM'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            {scan.metadata?.severity || 'INFO'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2 text-sm text-cyber-text-muted">
                            <ClockIcon className="w-4 h-4" aria-hidden="true" />
                            <span>
                              {formatTimestamp(
                                scan.metadata?.scanned_at || scan.created_at
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty state */}
            {!historyLoading && !backendOffline && recentScans.length === 0 && (
              <div className="text-center py-8 text-cyber-text-secondary">
                <p className="text-sm">No scan history yet. Run your first scan to see results here.</p>
              </div>
            )}
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-6">
            <ActivityFeed items={recentScans} loading={historyLoading} offline={backendOffline} />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
