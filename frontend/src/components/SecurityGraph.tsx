import React from 'react';
import { motion } from 'framer-motion';
import type { ScanHistoryItem } from '../services/api';

interface Props {
  items: ScanHistoryItem[];
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr: d.toISOString().slice(0, 10),
    });
  }
  return days;
}

export function SecurityGraph({ items }: Props) {
  const days = getLast7Days();

  // Count findings per day
  const countByDay = days.map(({ dateStr, label }) => {
    const count = items.filter((item) => {
      const ts = item.metadata?.scanned_at || item.created_at || '';
      return ts.startsWith(dateStr);
    }).length;
    return { day: label, count };
  });

  const maxCount = Math.max(...countByDay.map((d) => d.count), 1);
  const height = 160;
  const width = 100 / countByDay.length;

  const points = countByDay
    .map((d, i) => {
      const x = i * width + width / 2;
      const y = height - (d.count / maxCount) * (height - 30);
      return `${x},${y}`;
    })
    .join(' ');

  const hasData = countByDay.some((d) => d.count > 0);

  return (
    <div className="bg-cyber-surface border border-cyber-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-cyber-text mb-1">Scan Activity</h3>
        <p className="text-sm text-cyber-text-muted">Findings per day — last 7 days</p>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-40 text-cyber-text-muted text-sm">
          No scan data for this period
        </div>
      ) : (
        <div className="relative" style={{ height: `${height}px` }}>
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {[0, 25, 50, 75, 100].map((pct) => (
              <line
                key={pct}
                x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`}
                stroke="#262626" strokeWidth="1" strokeDasharray="4 4"
              />
            ))}
          </svg>

          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            <motion.polygon
              points={`0,${height} ${points} 100,${height}`}
              fill="url(#redGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            />

            <motion.polyline
              points={points}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }}
            />

            {countByDay.map((d, i) => {
              const x = i * width + width / 2;
              const y = height - (d.count / maxCount) * (height - 30);
              return (
                <motion.circle
                  key={d.day}
                  cx={`${x}%`}
                  cy={y}
                  r="4"
                  fill="#ef4444"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                />
              );
            })}
          </svg>

          {/* X labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
            {countByDay.map((d) => (
              <span key={d.day} className="text-xs text-cyber-text-muted font-mono">{d.day}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-between text-xs text-cyber-text-muted font-mono">
        <span>Findings per day</span>
        <span>Total: {items.length}</span>
      </div>
    </div>
  );
}
