import { motion } from "framer-motion";
import React from "react";

type Props = { children: React.ReactNode; delay?: number };

export default function FadeSlide({ children, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay }}
    >
      {children}
    </motion.div>
  );
} 