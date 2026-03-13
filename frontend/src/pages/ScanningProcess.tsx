import React, { useEffect, useState, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranchIcon,
  ShieldIcon,
  SparklesIcon,
  DatabaseIcon,
  XCircleIcon,
  CheckCircleIcon,
  LoaderIcon,
  AlertCircleIcon,
} from 'lucide-react';
import type { ScanResponse } from '../services/api';
import type { ScanJob } from '../App';

type StepStatus = 'pending' | 'active' | 'complete';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface Props {
  scanJob: ScanJob | null;
  onComplete: (result: ScanResponse) => void;
  onCancel: () => void;
}

const STEPS = [
  { label: 'Fetching Code',    icon: GitBranchIcon },
  { label: 'Semgrep Scanning', icon: ShieldIcon },
  { label: 'AI Analysis',      icon: SparklesIcon },
  { label: 'Memory Update',    icon: DatabaseIcon },
];

// Typical durations (ms) per step for progress simulation
const STEP_DURATIONS = [15000, 45000, 25000, 5000]; // 90s total for code scan

export function ScanningProcess({ scanJob, onComplete, onCancel }: Props) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(['active', 'pending', 'pending', 'pending']);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());

  const addLog = (message: string, type: LogEntry['type']) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), timestamp, message, type }]);
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Step status sync
  useEffect(() => {
    setStepStatuses(
      STEPS.map((_, i) => (i < currentStep ? 'complete' : i === currentStep ? 'active' : 'pending'))
    );
  }, [currentStep]);

  // Progress simulation + real scan awaiting
  useEffect(() => {
    if (!scanJob) return;

    startTime.current = Date.now();
    setProgress(0);
    setCurrentStep(0);
    setLogs([]);
    setError(null);

    const url = scanJob.url.replace('https://github.com/', '');
    const totalExpected = scanJob.type === 'iac' ? 480000 : 90000;

    // Log messages keyed to progress %
    const logSchedule: [number, string, LogEntry['type']][] = [
      [0,  `Initializing ${scanJob.type === 'iac' ? 'IaC' : 'code'} security scan for ${url}...`, 'info'],
      [2,  'Connecting to GitHub repository...', 'info'],
      [5,  'Cloning repository...', 'info'],
      [15, 'Repository cloned successfully', 'success'],
      [18, scanJob.type === 'iac' ? 'Running Checkov IaC scanner...' : 'Running Semgrep with 1063 rules...', 'info'],
      [25, 'Analyzing source files...', 'info'],
      [50, 'Scan findings collected', 'success'],
      [55, 'Sending findings to Gemini 2.5 Flash...', 'info'],
      [60, 'AI generating security report...', 'info'],
      [80, 'Building exploitation scenarios and fixes...', 'info'],
      [90, 'Storing results in Mem0 memory...', 'info'],
      [95, 'Finalizing report...', 'info'],
    ];

    let lastLogIdx = -1;
    let progressRef = 0;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      // Ease toward 95% asymptotically, never reach 100% until done
      const target = Math.min(95, (elapsed / totalExpected) * 100);
      progressRef = target;
      setProgress(Math.round(target));

      // Step progression based on progress
      const stepAtProgress = target < 15 ? 0 : target < 50 ? 1 : target < 85 ? 2 : 3;
      setCurrentStep(stepAtProgress);

      // Fire log messages
      logSchedule.forEach(([threshold, msg, type], idx) => {
        if (idx > lastLogIdx && progressRef >= threshold) {
          addLog(msg, type);
          lastLogIdx = idx;
        }
      });
    }, 500);

    // Await the real scan promise
    scanJob.promise
      .then((result) => {
        clearInterval(progressInterval);
        setProgress(100);
        setCurrentStep(4); // all complete
        addLog('Scan completed successfully!', 'success');
        const count = result.results?.length ?? result.failed_checks?.length ?? 0;
        addLog(`Found ${count} ${scanJob.type === 'iac' ? 'misconfigurations' : 'vulnerabilities'}`, count > 0 ? 'warning' : 'success');
        setTimeout(() => onComplete(result), 800);
      })
      .catch((err: any) => {
        clearInterval(progressInterval);
        const msg = err?.message || 'Scan failed';
        addLog(`Error: ${msg}`, 'error');
        setError(msg);
      });

    return () => clearInterval(progressInterval);
  }, [scanJob]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error':   return 'text-cyber-red';
      default:        return 'text-cyber-text-secondary';
    }
  };

  const repoLabel = scanJob?.url.replace('https://github.com/', '') ?? 'repository';

  return (
    <main className="min-h-screen w-full bg-cyber-black grid-background">
      <div className="ml-52 pt-16">
        <div className="p-6 md:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-cyber-text mb-2">
              {error ? 'Scan Failed' : progress >= 100 ? 'Scan Complete' : 'AI is analyzing your code...'}
            </h1>
            <p className="text-cyber-text-secondary font-mono">{repoLabel}</p>
          </motion.div>

          {/* Error state */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
            >
              <AlertCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">Scan failed</p>
                <p className="text-xs text-cyber-text-muted mt-1">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-4xl mx-auto mb-8"
          >
            <div className="bg-cyber-surface border border-cyber-border rounded-lg p-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-cyber-text">Scan Progress</span>
                <span className="text-sm text-cyber-text-muted font-mono">{progress}%</span>
              </div>
              <div className="h-3 bg-cyber-charcoal rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${
                    error ? 'from-red-600 to-red-500' : 'from-cyber-red to-cyber-red-light shadow-red-glow'
                  }`}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {!error && progress < 100 && (
                <p className="mt-3 text-center text-xs text-cyber-text-muted">
                  {scanJob?.type === 'iac'
                    ? 'IaC scans can take 5-8 minutes for large repos'
                    : 'Code scans typically complete in 60-120 seconds'}
                </p>
              )}
            </div>
          </motion.div>

          {/* Pipeline Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="max-w-5xl mx-auto mb-8"
          >
            <div className="bg-cyber-surface border border-cyber-border rounded-lg p-8">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const status = index < (currentStep >= 4 ? 4 : currentStep)
                    ? 'complete'
                    : index === currentStep && currentStep < 4
                    ? 'active'
                    : 'pending';

                  return (
                    <Fragment key={index}>
                      <div className="flex flex-col items-center flex-1">
                        <motion.div
                          className={`relative w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                            status === 'complete'
                              ? 'bg-green-500/20 border-2 border-green-500'
                              : status === 'active'
                              ? 'bg-cyber-red/20 border-2 border-cyber-red shadow-red-glow'
                              : 'bg-cyber-charcoal border-2 border-cyber-border'
                          }`}
                          animate={status === 'active' ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Icon
                            className={`w-7 h-7 ${
                              status === 'complete' ? 'text-green-400' : status === 'active' ? 'text-cyber-red' : 'text-cyber-text-muted'
                            }`}
                            aria-hidden="true"
                          />
                          {status === 'complete' && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyber-surface rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="w-4 h-4 text-green-400" />
                            </div>
                          )}
                          {status === 'active' && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyber-surface rounded-full flex items-center justify-center">
                              <LoaderIcon className="w-4 h-4 text-cyber-red animate-spin" />
                            </div>
                          )}
                        </motion.div>
                        <span className={`text-sm font-medium text-center ${status === 'active' ? 'text-cyber-text' : 'text-cyber-text-muted'}`}>
                          {step.label}
                        </span>
                      </div>

                      {index < STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 bg-cyber-border relative mx-4 max-w-[100px]">
                          {status === 'complete' && (
                            <motion.div
                              className="absolute inset-0 bg-green-500"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.5 }}
                              style={{ transformOrigin: 'left' }}
                            />
                          )}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Logs Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="max-w-5xl mx-auto mb-8"
          >
            <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
              <div className="bg-cyber-charcoal px-6 py-3 border-b border-cyber-border">
                <h3 className="text-sm font-semibold text-cyber-text">Scan Logs</h3>
              </div>
              <div ref={logRef} className="p-4 h-64 overflow-y-auto font-mono text-sm">
                <AnimatePresence>
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mb-2"
                    >
                      <span className="text-cyber-text-muted">[{log.timestamp}]</span>{' '}
                      <span className={getLogColor(log.type)}>{log.message}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Cancel Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="max-w-5xl mx-auto flex justify-end"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              className="flex items-center space-x-2 px-6 py-3 bg-cyber-surface border border-cyber-red text-cyber-red rounded-lg hover:bg-cyber-red hover:text-white transition-colors"
              aria-label="Cancel scan"
            >
              <XCircleIcon className="w-5 h-5" aria-hidden="true" />
              <span className="font-semibold">{error ? 'Go Back' : 'Cancel'}</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
