import { motion } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface ThankYouScreenProps {
  total: number;
}

export default function ThankYouScreen({ total }: ThankYouScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
        className="text-center"
      >
        {/* Success icon */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 0.6,
            ease: 'easeInOut',
          }}
          className="mb-8 inline-flex items-center justify-center relative"
        >
          <CheckCircle className="w-40 h-40 text-green-400" strokeWidth={2} />
          
          {/* Sparkles around the icon */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                x: Math.cos((i * Math.PI * 2) / 8) * 80,
                y: Math.sin((i * Math.PI * 2) / 8) * 80,
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="absolute"
            >
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </motion.div>
          ))}
        </motion.div>

        {/* Thank you message */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-7xl font-black text-white mb-4"
        >
          Thank You!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl text-white/90 mb-8"
        >
          Your payment has been processed
        </motion.p>

        {/* Total paid */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/20 backdrop-blur-lg rounded-3xl px-12 py-8 mb-8"
        >
          <p className="text-white/70 text-xl mb-2">Total Paid</p>
          <p className="text-6xl font-black text-white">
            {formatCurrency(total)}
          </p>
        </motion.div>

        {/* Farewell message */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl text-white/80"
        >
          Please collect your receipt
        </motion.p>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xl text-white/60 mt-4"
        >
          We hope to see you again soon! 😊
        </motion.p>
      </motion.div>
    </div>
  );
}
