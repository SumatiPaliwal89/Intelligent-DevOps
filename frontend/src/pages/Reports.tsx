import React, { useEffect, useState } from 'react';
import {
  GitBranchIcon,
  FileCodeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldIcon,
  LoaderIcon,
  WifiOffIcon,
  SparklesIcon,
  HashIcon,
  AlertTriangleIcon,
  CopyIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getScanHistory, type ScanHistoryItem, type ScanResponse } from '../services/api';

interface Props {
  latestScan?: ScanResponse | null;
}

interface ScanSession {
  key: string;
  repo: string;
  type: 'code' | 'iac';
  date: string;         // YYYY-MM-DD
  displayDate: string;
  totalFindings: number;
  severities: Record<string, number>;
  worstSeverity: string;
}

/** Render LLM markdown (##, **, -, `) as styled React elements */
function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-sm font-bold text-purple-300 mt-4 mb-1 first:mt-0">{line.slice(3)}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-xs font-semibold text-cyber-text mt-3 mb-1">{line.slice(4)}</h3>;
    }
    if (line.trim() === '') return <div key={i} className="h-1" />;

    function inlineFormat(s: string): React.ReactNode[] {
      const parts: React.ReactNode[] = [];
      const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
      let last = 0; let m: RegExpExecArray | null;
      while ((m = regex.exec(s)) !== null) {
        if (m.index > last) parts.push(s.slice(last, m.index));
        if (m[2] !== undefined) parts.push(<strong key={m.index} className="text-cyber-text font-semibold">{m[2]}</strong>);
        else if (m[3] !== undefined) parts.push(<code key={m.index} className="bg-cyber-black/60 px-1 rounded text-cyber-red font-mono text-[11px]">{m[3]}</code>);
        last = m.index + m[0].length;
      }
      if (last < s.length) parts.push(s.slice(last));
      return parts;
    }

    if (/^[\-\*] /.test(line)) {
      return (
        <div key={i} className="flex gap-2 text-xs text-cyber-text-secondary leading-relaxed pl-2">
          <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    }
    return <p key={i} className="text-xs text-cyber-text-secondary leading-relaxed">{inlineFormat(line)}</p>;
  });
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0, ERROR: 1, HIGH: 2, MEDIUM: 3, WARNING: 4, LOW: 5, INFO: 6, UNKNOWN: 7,
};

function worstOf(severities: Record<string, number>): string {
  return Object.keys(severities).sort(
    (a, b) => (SEVERITY_ORDER[a.toUpperCase()] ?? 7) - (SEVERITY_ORDER[b.toUpperCase()] ?? 7)
  )[0] || 'UNKNOWN';
}

function groupIntoSessions(history: ScanHistoryItem[]): ScanSession[] {
  const map = new Map<string, ScanSession>();

  for (const item of history) {
    const repo = item.metadata?.repo || 'Unknown';
    const rawDate = item.metadata?.scanned_at || item.created_at || '';
    const date = rawDate.slice(0, 10); // YYYY-MM-DD
    const type = (item.metadata?.type === 'iac' ? 'iac' : 'code') as 'code' | 'iac';
    const key = `${repo}|${date}|${type}`;

    if (!map.has(key)) {
      const d = new Date(rawDate);
      const displayDate = isNaN(d.getTime())
        ? date
        : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      map.set(key, { key, repo, type, date, displayDate, totalFindings: 0, severities: {}, worstSeverity: 'UNKNOWN' });
    }

    const session = map.get(key)!;
    session.totalFindings++;
    const sev = (item.metadata?.severity || 'UNKNOWN').toUpperCase();
    session.severities[sev] = (session.severities[sev] || 0) + 1;
  }

  // Compute worst severity and sort newest first
  const sessions = Array.from(map.values()).map((s) => ({
    ...s,
    worstSeverity: worstOf(s.severities),
  }));

  return sessions.sort((a, b) => b.date.localeCompare(a.date));
}

function getSeverityColor(sev: string) {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'ERROR')  return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (s === 'HIGH')                        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (s === 'MEDIUM' || s === 'WARNING')   return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

export function Reports({ latestScan }: Props) {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);
  const [showFullAI, setShowFullAI] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBackendOffline(false);

    getScanHistory(200)
      .then((data) => {
        if (!cancelled) {
          setSessions(groupIntoSessions(data.history));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setBackendOffline(true); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [latestScan]); // re-fetch when a new scan completes

  return (
    <main className="min-h-screen w-full bg-cyber-black grid-background">
      <div className="ml-52 pt-16">
        <div className="p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-cyber-text mb-2">Reports</h1>
            <p className="text-cyber-text-secondary">One report per scan run — grouped by repository</p>
          </motion.div>

          {/* Latest scan result */}
          {latestScan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-cyber-surface border border-cyber-red/40 rounded-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-cyber-red animate-pulse" />
                <h2 className="text-lg font-bold text-cyber-text">Latest Scan</h2>
                {latestScan.scan_id && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-cyber-text-muted font-mono">
                    <HashIcon className="w-3 h-3" />
                    {latestScan.scan_id}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-cyber-charcoal rounded-lg p-3">
                  <p className="text-xs text-cyber-text-muted mb-1">Repository</p>
                  <p className="text-sm font-mono text-cyber-text truncate">{latestScan.repository}</p>
                </div>
                <div className="bg-cyber-charcoal rounded-lg p-3">
                  <p className="text-xs text-cyber-text-muted mb-1">Status</p>
                  <p className="text-sm font-semibold text-green-400">{latestScan.status}</p>
                </div>
                <div className="bg-cyber-charcoal rounded-lg p-3">
                  <p className="text-xs text-cyber-text-muted mb-1">Findings</p>
                  <p className="text-2xl font-bold text-cyber-red">
                    {latestScan.results?.length ?? latestScan.failed_checks?.length ?? 0}
                  </p>
                </div>
                <div className="bg-cyber-charcoal rounded-lg p-3">
                  <p className="text-xs text-cyber-text-muted mb-1">Stored in Mem0</p>
                  <p className="text-sm text-cyber-text">{latestScan.stored_in_mem0} entries</p>
                </div>
              </div>

              <p className="text-sm text-cyber-text-secondary mb-4">{latestScan.summary}</p>

              {latestScan.llm_analysis && (
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-cyber-surface border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-cyber-text flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-purple-400" />
                      AI Security Analysis &amp; Suggested Fixes
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigator.clipboard.writeText(latestScan.llm_analysis!)}
                        className="flex items-center gap-1 text-xs text-cyber-text-muted hover:text-cyber-red transition-colors"
                      >
                        <CopyIcon className="w-3 h-3" />
                        Copy
                      </button>
                      <button
                        onClick={() => setShowFullAI(!showFullAI)}
                        className="text-xs text-cyber-red hover:text-red-400 transition-colors"
                      >
                        {showFullAI ? 'Collapse' : 'Expand'}
                      </button>
                    </div>
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${showFullAI ? '' : 'max-h-48'}`}>
                    <div className="space-y-0.5">
                      {renderMarkdown(latestScan.llm_analysis)}
                    </div>
                  </div>
                  {!showFullAI && (
                    <div className="mt-2 text-center border-t border-purple-500/20 pt-2">
                      <button onClick={() => setShowFullAI(true)} className="text-xs text-cyber-red hover:text-red-400">
                        Show full report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Offline banner */}
          {backendOffline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
            >
              <WifiOffIcon className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-400">Backend offline</p>
                <p className="text-xs text-cyber-text-muted">Start the backend on port 8000 to load scan history.</p>
              </div>
            </motion.div>
          )}

          {loading && !backendOffline && (
            <div className="flex items-center justify-center py-16 gap-3">
              <LoaderIcon className="w-6 h-6 animate-spin text-cyber-red" />
              <span className="text-cyber-text-secondary">Loading reports...</span>
            </div>
          )}

          {/* Scan sessions grid */}
          {!loading && !backendOffline && sessions.length > 0 && (
            <>
              <p className="text-sm text-cyber-text-muted mb-4">{sessions.length} scan session{sessions.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {sessions.map((session, index) => (
                  <motion.div
                    key={session.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.4 }}
                    className="bg-cyber-surface border border-cyber-border rounded-lg p-5 hover:border-cyber-border-light transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyber-charcoal rounded-lg mt-0.5">
                          {session.type === 'iac'
                            ? <FileCodeIcon className="w-5 h-5 text-pink-400" />
                            : <GitBranchIcon className="w-5 h-5 text-purple-400" />
                          }
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-cyber-text font-mono leading-tight">
                            {session.repo}
                          </h3>
                          <p className="text-xs text-cyber-text-muted mt-0.5">
                            {session.type === 'iac' ? 'IaC Scan' : 'Code Scan'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold bg-green-400/10 text-green-400 border-green-400/30">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Completed
                      </div>
                    </div>

                    {/* Severity breakdown */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${getSeverityColor(session.worstSeverity)}`}>
                        Worst: {session.worstSeverity}
                      </span>
                      {Object.entries(session.severities)
                        .sort(([a], [b]) => (SEVERITY_ORDER[a] ?? 7) - (SEVERITY_ORDER[b] ?? 7))
                        .slice(0, 3)
                        .map(([sev, count]) => (
                          <span key={sev} className="text-xs text-cyber-text-muted">
                            {sev}: <span className="text-cyber-text font-semibold">{count}</span>
                          </span>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-cyber-border">
                      <div className="flex items-center gap-1.5 text-xs text-cyber-text-muted">
                        <AlertTriangleIcon className="w-3.5 h-3.5" />
                        <span><span className="text-cyber-text font-semibold">{session.totalFindings}</span> findings</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-cyber-text-muted">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {session.displayDate}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && !backendOffline && sessions.length === 0 && !latestScan && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-cyber-surface border border-cyber-border rounded-lg p-12 text-center"
            >
              <ShieldIcon className="w-14 h-14 text-cyber-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-cyber-text mb-2">No Reports Yet</h3>
              <p className="text-cyber-text-secondary">Scan a repository to generate your first report.</p>
            </motion.div>
          )}

          {!loading && backendOffline && !latestScan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-cyber-surface border border-cyber-border rounded-lg p-12 text-center"
            >
              <XCircleIcon className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-cyber-text mb-2">Cannot Load Reports</h3>
              <pre className="mt-4 text-xs text-cyber-red font-mono bg-cyber-charcoal rounded p-3 inline-block text-left">
                python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
              </pre>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
