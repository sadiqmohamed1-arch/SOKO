import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'li';
}

export const Reveal: React.FC<RevealProps> = ({ children, className, delay = 0, as = 'div' }) => {
  const reduce = useReducedMotion();
  const Component = as === 'li' ? motion.li : motion.div;
  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
};
