import { motion } from 'motion/react';

// --- COMPONENTS ---

export const FloatingParticles = () => {
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: Math.random() * 12 + 4,
    color: i % 2 === 0 ? '#ff6b9d' : '#9b59b6',
    initialX: Math.random() * 100,
    duration: Math.random() * 20 + 25,
    delay: Math.random() * -45,
    xOffset: Math.random() * 40 - 20,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.initialX}vw`, y: `-10vh`, opacity: 0 }}
          animate={{
            y: ['-10vh', '110vh'],
            x: [`${p.initialX}vw`, `${p.initialX + p.xOffset / 10}vw`, `${p.initialX}vw`],
            opacity: [0, 0.3, 0.3, 0],
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
          className="absolute rounded-full blur-[2px]"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
};

export const TransparentLogo = ({ src, className, theme }: { src: string, className?: string, theme?: 'light' | 'dark' }) => {
  return (
    <div className={className}>
      <motion.img 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        src={src} 
        alt="Logo" 
        className={`w-full h-full object-contain ${theme === 'light' ? 'brightness-0 opacity-80' : ''}`} 
      />
    </div>
  );
};

export const Marquee = ({ items, reverse = false, theme }: { items: string[], reverse?: boolean, theme: 'light' | 'dark' }) => {
  return (
    <div className="relative flex overflow-hidden w-full py-2 group/marquee">
      <div className={`absolute left-0 top-0 bottom-0 w-32 z-20 pointer-events-none bg-gradient-to-r to-transparent ${theme === 'dark' ? 'from-black' : 'from-white'}`} />
      <div className={`absolute right-0 top-0 bottom-0 w-32 z-20 pointer-events-none bg-gradient-to-l to-transparent ${theme === 'dark' ? 'from-black' : 'from-white'}`} />
      <div className={`flex ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} will-change-transform`} style={{ width: 'max-content' }}>
        {[...items, ...items].map((src, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.1, zIndex: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`flex-shrink-0 w-[240px] h-[240px] rounded-[2.5rem] overflow-hidden m-2 relative shadow-2xl cursor-pointer transition-all duration-300 
              ${theme === 'dark' ? 'bg-white/5 border border-white/20' : 'bg-black/5 border border-black/20'}`}
          >
            <img src={src} alt="NFT" className="w-full h-full object-cover" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- ROUTING ---
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </Router>
  );
}
