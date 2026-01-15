import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export default function LoadingOverlay({ show, message = "Loading..." }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative flex flex-col items-center gap-4 px-6 py-5 rounded-2xl glass shadow-float max-w-xs w-full text-center"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="relative w-20 h-20"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-2 rounded-full bg-brand-500/15 blur-xl" />
              <Image
                src="/assets/yugi-mascot-1.png"
                alt="Planaway loading"
                fill
                priority
                sizes="80px"
                className="object-contain"
              />
            </motion.div>
            <div className="text-lg font-semibold text-ink-900 font-logo">{message}</div>
            <div className="text-sm text-ink-600">
              Keeping things tidy while we get your next view ready.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
