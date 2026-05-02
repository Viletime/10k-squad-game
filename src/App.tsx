import { useState, useEffect, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  const [error, setError] = useState(false);

  useEffect(() => {
    const img = new Image();
    
    // Tenta resolver o caminho de forma absoluta se necessário
    const absolutePath = src.startsWith('http') ? src : window.location.origin + src;
    
    if (src.startsWith('http')) {
      img.crossOrigin = "anonymous";
    }
    
    img.src = src;
    
    img.onerror = () => {
      // Se falhar com o caminho relativo, tenta o absoluto antes de desistir
      if (img.src !== absolutePath) {
        img.src = absolutePath;
      } else {
        console.warn("Falha crítica ao carregar imagem:", src);
        setError(true);
      }
    };

    img.onload = () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const targetR = data[0];
        const targetG = data[1];
        const targetB = data[2];
        const tolerance = 30;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          const distance = Math.sqrt(
            Math.pow(r - targetR, 2) + 
            Math.pow(g - targetG, 2) + 
            Math.pow(b - targetB, 2)
          );

          if (distance < tolerance) {
            data[i + 3] = 0;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        setProcessedSrc(canvas.toDataURL());
      } catch (err) {
        console.error("Erro no processamento do Canvas (CORS provavelmente):", err);
        // Se der erro de CORS no canvas, usamos a imagem original
        setError(true);
      }
    };
  }, [src]);

  const finalSrc = processedSrc || src;

  return (
    <div className={className}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {processedSrc || error ? (
        <motion.img 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          src={finalSrc} 
          alt="Logo" 
          className={`w-full h-full object-contain ${theme === 'light' ? 'brightness-0 opacity-80' : ''}`} 
        />
      ) : (
        <div className="w-full h-full animate-pulse bg-current/10 rounded-lg" />
      )}
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
