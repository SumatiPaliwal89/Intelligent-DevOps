import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
interface RiskGaugeProps {
  score: number;
  maxScore?: number;
}
export function RiskGauge({ score, maxScore = 100 }: RiskGaugeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const percentage = score / maxScore * 100;
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - percentage / 100 * circumference;
  const getRiskLevel = () => {
    if (score >= 70)
    return {
      label: 'CRITICAL',
      color: '#ef4444'
    };
    if (score >= 40)
    return {
      label: 'ELEVATED',
      color: '#f59e0b'
    };
    return {
      label: 'NORMAL',
      color: '#10b981'
    };
  };
  const risk = getRiskLevel();
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative w-48 h-48">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="#2a2a2a"
            strokeWidth="12"
            fill="none" />

          {/* Animated progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            stroke={risk.color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{
              strokeDashoffset: circumference
            }}
            animate={{
              strokeDashoffset: mounted ? offset : circumference
            }}
            transition={{
              duration: 2,
              ease: 'easeOut'
            }}
            style={{
              filter:
              score >= 70 ?
              'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' :
              'none'
            }} />

        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.5
            }}
            animate={{
              opacity: 1,
              scale: 1
            }}
            transition={{
              delay: 0.5,
              duration: 0.5
            }}
            className="text-center">

            <div
              className={`text-5xl font-bold mb-1 ${score >= 70 ? 'text-cyber-red' : 'text-cyber-text'}`}>

              {score}
            </div>
            <div className="text-sm text-cyber-text-muted uppercase tracking-wider">
              Risk Score
            </div>
          </motion.div>
        </div>
      </div>

      {/* Risk level label */}
      <motion.div
        initial={{
          opacity: 0,
          y: 10
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          delay: 1,
          duration: 0.5
        }}
        className="mt-4 px-4 py-2 rounded-lg border"
        style={{
          borderColor: risk.color,
          backgroundColor: `${risk.color}15`
        }}>

        <span
          className="text-sm font-semibold uppercase tracking-wider"
          style={{
            color: risk.color
          }}>

          {risk.label}
        </span>
      </motion.div>
    </div>);

}