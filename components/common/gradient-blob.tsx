import { motion } from 'framer-motion'

interface GradientBlobProps {
  className?: string
  variant?: 'blue-cyan' | 'purple-pink' | 'cyan-blue'
}

export function GradientBlob({
  className = '',
  variant = 'blue-cyan',
}: GradientBlobProps) {
  const variants = {
    'blue-cyan': 'from-blue-600 via-indigo-500 to-blue-500',
    'purple-pink': 'from-blue-700 via-indigo-600 to-blue-500',
    'cyan-blue': 'from-indigo-500 via-blue-600 to-indigo-600',
  }

  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 ${className} bg-gradient-to-r ${variants[variant]}`}
      animate={{
        x: [0, 50, -50, 0],
        y: [0, 50, -50, 0],
        scale: [1, 1.1, 0.9, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}
