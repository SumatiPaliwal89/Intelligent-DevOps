import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangleIcon,
  ShieldAlertIcon,
  BugIcon,
  BoxIcon } from
'lucide-react';
interface AlertCardProps {
  title: string;
  description: string;
  timestamp: string;
  type: 'critical' | 'warning' | 'info';
  index?: number;
}
const iconMap: Record<string, BoxIcon> = {
  critical: AlertTriangleIcon,
  warning: ShieldAlertIcon,
  info: BugIcon
};
export function AlertCard({
  title,
  description,
  timestamp,
  type,
  index = 0
}: AlertCardProps) {
  const Icon = iconMap[type];
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: -20
      }}
      animate={{
        opacity: 1,
        x: 0
      }}
      transition={{
        delay: index * 0.1,
        duration: 0.4
      }}
      className="relative bg-cyber-surface border-2 border-cyber-red rounded-lg p-4 overflow-hidden animate-pulse-red"
      role="alert"
      aria-live="polite">

      {/* Red glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyber-red/5 to-transparent pointer-events-none" />

      <div className="relative flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-cyber-red/20 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-cyber-red" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-cyber-text mb-1">
            {title}
          </h3>
          <p className="text-sm text-cyber-text-secondary mb-2">
            {description}
          </p>
          <time
            className="text-xs text-cyber-text-muted font-mono"
            dateTime={timestamp}>

            {timestamp}
          </time>
        </div>
      </div>
    </motion.div>);

}