
import React from 'react';
import { motion } from 'framer-motion';

interface VoiceVisualizerProps {
  isActive: boolean;
  userVolume: number; // 0 to 1 scale
  aiVolume: number;   // 0 to 1 scale
  mode?: 'full' | 'mini';
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive, userVolume, aiVolume, mode = 'full' }) => {

  // MINI MODE (For Chat/Nav Bar)
  if (mode === 'mini') {
    return (
      <div className="relative w-8 h-8 flex items-center justify-center" style={{ position: 'relative', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-md"
          animate={{
            scale: isActive ? 1 + (aiVolume * 1.5) : 0.8,
            opacity: isActive ? 0.8 : 0.3,
          }}
          style={{ position: 'absolute', inset: 0, borderRadius: '9999px', backgroundColor: 'rgba(6, 182, 212, 0.5)', filter: 'blur(4px)' }}
        />
        {/* Core */}
        <motion.div
          className={`relative w-6 h-6 rounded-full border shadow-inner flex items-center justify-center overflow-hidden`}
          animate={{
            scale: isActive ? 1 + (aiVolume * 0.2) : 1,
          }}
          style={{
            position: 'relative', width: '1.5rem', height: '1.5rem', borderRadius: '9999px', border: '1px solid', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            background: isActive ? 'linear-gradient(to bottom right, #22d3ee, #2563eb)' : 'var(--color-obsidian-800)',
            borderColor: isActive ? 'rgba(255, 255, 255, 0.6)' : 'var(--glass-border)'
          }}
        />
      </div>
    );
  }

  // FULL MODE (Voice Page)
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-black">

      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black" />

      {/* AI ORB (Center) */}
      <div className="relative z-10 mb-20">
        <div className="relative">
          {/* Outer Pulsing Rings */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-cyan-500/30"
              animate={{
                scale: isActive ? [1, 1.5 + (aiVolume * i)] : 1,
                opacity: isActive ? [0.5, 0] : 0,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Core Orb */}
          <motion.div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 relative overflow-hidden shadow-[0_0_50px_rgba(14,165,233,0.3)]"
            animate={{
              scale: isActive ? 1 + (aiVolume * 0.1) : 1,
              boxShadow: isActive ? `0 0 ${50 + (aiVolume * 100)}px rgba(14,165,233,0.6)` : '0 0 50px rgba(14,165,233,0.3)',
            }}
          >
            <motion.div
              className="w-full h-full opacity-40 mix-blend-overlay"
              style={{ width: '100%', height: '100%', opacity: 0.4, backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')", mixBlendMode: 'overlay' }}
            />
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6, 182, 212, 0.2), transparent)' }}
            />
          </motion.div>
        </div>
      </div>

      {/* User Voice Bars */}
      <div className="flex items-end gap-1 h-16 mb-12">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 bg-cyan-400 rounded-full"
            animate={{
              height: isActive ? 4 + (userVolume * 100 * Math.random()) : 4,
              opacity: userVolume > 0.01 ? 1 : 0.3
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        ))}
      </div>

      {/* Status Text */}
      <div className="absolute bottom-24">
        <p className={`font-mono text-xs tracking-[0.2em] font-bold ${isActive ? 'animate-pulse text-cyan-400' : 'text-gray-500'}`}>
          {isActive
            ? (aiVolume > 0.05 ? "LYSIS SPEAKING" : (userVolume > 0.05 ? "LISTENING" : "WAITING"))
            : "INITIALIZING CONNECTION"}
        </p>
      </div>

      {/* Transcription Placeholder (Could be expanded) */}
      <div className="absolute bottom-40 w-full px-10 text-center">
        <p className="text-sm font-light min-h-[20px] text-gray-400">
          {/* Real-time transcription could go here */}
        </p>
      </div>

    </div>
  );
};

export default VoiceVisualizer;
