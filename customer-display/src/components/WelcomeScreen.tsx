import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  storeName: string;
}

export default function WelcomeScreen({ storeName }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center"
      >
        {/* Logo/Icon */}
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="mb-8 inline-flex items-center justify-center"
        >
          <div className="relative">
            <ShoppingBag className="w-32 h-32 text-white" strokeWidth={1.5} />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute -top-4 -right-4"
            >
              <Sparkles className="w-12 h-12 text-yellow-300" />
            </motion.div>
          </div>
        </motion.div>

        {/* Welcome message */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-6xl font-bold text-white mb-6"
        >
          Welcome to {storeName}
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-2xl text-white/80 mb-12"
        >
          Your order will appear here
        </motion.p>

        {/* Animated dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3 justify-center"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-4 h-4 bg-white rounded-full"
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Footer message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-12 left-0 right-0 text-center"
      >
        <p className="text-white/60 text-lg">
          Please proceed to the counter to place your order
        </p>
      </motion.div>
    </div>
  );
}
