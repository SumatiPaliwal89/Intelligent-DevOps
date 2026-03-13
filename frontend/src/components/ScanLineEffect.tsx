import React from 'react';
import { motion } from 'framer-motion';
export function ScanLineEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-[2px]"
        style={{
          background:
          'linear-gradient(to bottom, transparent, rgba(239, 68, 68, 0.3), transparent)',
          filter: 'blur(1px)'
        }}
        animate={{
          top: ['0%', '100%']
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'linear'
        }} />

    </div>);

}