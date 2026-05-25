import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun as SunIcon, Moon as MoonIcon, Menu, X, ExternalLink, Globe, Wallet, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FloatingParticles, TransparentLogo, Marquee } from '../App';
import { useWallet } from '../lib/WalletContext';

export default function Home() {
  const { account, disconnectWallet, setIsModalOpen, isModalOpen, connectWallet } = useWallet();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const [imagesRow1, setImagesRow1] = useState([
    "/2d3bb58eeae451c9ba88008c315f5cb4.avif", 
    "/2e1161b0baaf7208078934d877d11ce0.avif", 
    "/2ef94ab77fefc8d8b3fca2417b9171f4.avif", 
    "/36e3c433ee55b820425ce04dd074a8a6.avif", 
    "/622f80436ab059ece2b769695ee7a44c.avif",
    "/7e1e0c1fce3a13d6b718fb3929d51396.avif",
    "/802c7126efe63aff637bbaae2484492e.avif",
    "/c34bd9e6785385ee5073490cafe34c95.avif",
    "/caf3d641488eeab2c2e80f0c5b12bc1b.avif",
    "/fda273936130247b4db855034f350b9d.avif"
  ]);
  const [imagesRow2, setImagesRow2] = useState([
    "/4dcca27a36a594dc0dd09c67c09e6f47.png", 
    "/5257040012b3ed795b9e80b1dc4a3138.png", 
    "/9637f49f56bdb7c439023c5b87974fa4.png", 
    "/974ebe0c120edbaee51ba2fcc274b47c.png", 
    "/9dfd3475a0698bf75782bcd5fad91413_1.png",
    "/a298a479624ef450ed638716df091ce2.png",
    "/cc58d84a5e0a0bcefe3c59352b221388.png",
    "/e42062911907f1a17bddae6d65e82c14.png",
    "/f179d74d4e3bba6db2a2e8c7128dd6a0.png",
    "/f776df5df5c4832432694489308af210.png"
  ]);

  useEffect(() => {
    async function loadLocalNFTs() {
      try {
        const res = await fetch('/traits-data.json');
        if (res.ok) {
          const data = await res.json();
          if (data.fullNFTs && data.fullNFTs.length > 0) {
            const allImages = data.fullNFTs
              .map((n: any) => n.image_url || n.display_image_url || n.image_preview_url)
              .filter(Boolean);
            
            if (allImages.length > 20) {
              // Shuffle and take 20
              const shuffled = [...allImages].sort(() => 0.5 - Math.random());
              setImagesRow1(shuffled.slice(0, 10));
              setImagesRow2(shuffled.slice(10, 20));
            }
          }
        }
      } catch (e) {
        console.log('No local traits-data.json for home gallery');
      }
    }
    loadLocalNFTs();
  }, []);

  /* Stats: update weekly */
  const [nftStats, setNftStats] = useState({
    totalSupply: "3,333",
    holders: "1,183",
    floorPrice: "1,371.48",
    totalVolume: "1M+ MON",
    volumeUsd: "~$41.6K+ USD",
    isLive: false
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/nft-stats');
        if (response.ok) {
          const data = await response.json();
          setNftStats({
            totalSupply: data.totalSupply?.toLocaleString() || "3,333",
            holders: data.holders?.toLocaleString() || "1,100+",
            floorPrice: typeof data.floorPrice === 'number' ? data.floorPrice.toFixed(2) : "1,579.12",
            totalVolume: (data.totalVolume || "1M+ MON"),
            volumeUsd: data.volumeUsd ? (data.volumeUsd.startsWith('~') ? data.volumeUsd : `~${data.volumeUsd}`) : "~$41.6K+ USD",
            isLive: !data._isMock
          });
        }
        setIsStatsLoading(false);
      } catch (err) {
        console.error("Failed to fetch NFT stats:", err);
        setIsStatsLoading(false);
      }
    }
    fetchStats();
    // Refresh every 1 minute
    const interval = setInterval(fetchStats, 1 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { value: nftStats.totalSupply, label: "NFTs" },
    { value: nftStats.holders, label: "Holders" },
    { value: `${nftStats.floorPrice} MON`, label: "Floor" },
  ];

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'scrollbar-hide');
    document.documentElement.classList.add(theme, 'scrollbar-hide');
    // Ensure body also has it if needed
    document.body.classList.add('scrollbar-hide');
    
    return () => {
      document.documentElement.classList.remove('scrollbar-hide');
      document.body.classList.remove('scrollbar-hide');
    };
  }, [theme]);

  return (
    <div id="top" className={`min-h-screen relative transition-colors duration-500 selection:bg-purple-200 selection:text-purple-900 overflow-x-hidden scrollbar-hide ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <FloatingParticles />
      {/* HEADER */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 transition-all duration-300 border-b flex items-center will-change-transform ${
        isScrolled 
          ? `backdrop-blur-xl ${theme === 'dark' ? 'bg-black/80 border-[#ff6b9d]/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-white' : 'bg-white/80 border-black/10 shadow-lg text-black'}`
          : `bg-transparent border-transparent ${theme === 'dark' ? 'text-white' : 'text-black'}`
      }`}>
        {/* LEFT PART: LOGO */}
        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
            <img src="/logo.png" alt="Logo" loading="eager" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-black uppercase italic tracking-tighter">10K SQUAD</span>
        </div>

        {/* CENTER PART: LINKS */}
        <div className="hidden md:flex items-center justify-center gap-8 text-[11px] uppercase font-bold tracking-[0.2em]">
          <a href="#top" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 hover:scale-110 active:scale-95">Home</a>
          <a href="#utility" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 hover:scale-110 active:scale-95">Utility</a>
          <a href="#about" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 hover:scale-110 active:scale-95">About</a>
          <Link to="/traits" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 hover:scale-110 active:scale-95">Collection</Link>
          <Link to="/swap" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 hover:scale-110 active:scale-95 text-[#ff6b9d]">Swap</Link>
          <Link to="/game" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 hover:scale-110 active:scale-95">Play</Link>
        </div>

        {/* RIGHT PART: TOGGLE */}
        <div className={`flex-1 flex items-center justify-end gap-3 md:gap-6 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          {account ? (
             <div className="hidden sm:flex items-center gap-2">
               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-current/10 bg-current/5`}>
                 <div className="w-2 h-2 rounded-full bg-green-500" />
                 <span className="text-[9px] font-black font-mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
               </div>
               <motion.button
                 onClick={disconnectWallet}
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 title="Disconnect Wallet"
                 className="p-1.5 rounded-xl opacity-50 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
               >
                 <LogOut size={16} />
               </motion.button>
             </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              <Wallet size={14} />
              Connect
            </motion.button>
          )}

          <motion.button 
            whileHover={{ scale: 1.2, rotate: 15 }} 
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme} 
            className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 cursor-pointer p-2"
          >
            {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
          </motion.button>
          
          {/* MOBILE MENU BUTTON */}
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMenu} 
            className="md:hidden opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 cursor-pointer p-2"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[40] pt-[80px] bg-black flex flex-col items-center justify-start gap-8 p-10 text-white md:hidden"
          >
            <nav className="flex flex-col items-center gap-8 text-lg uppercase font-black italic tracking-widest">
              <motion.a whileHover={{ scale: 1.1, x: 10 }} whileTap={{ scale: 0.95 }} href="#top" onClick={closeMenu} className="hover:text-[#ff6b9d] transition-colors">Home</motion.a>
              <motion.a whileHover={{ scale: 1.1, x: 10 }} whileTap={{ scale: 0.95 }} href="#utility" onClick={closeMenu} className="hover:text-[#ff6b9d] transition-colors">Utility</motion.a>
              <motion.a whileHover={{ scale: 1.1, x: 10 }} whileTap={{ scale: 0.95 }} href="#about" onClick={closeMenu} className="hover:text-[#ff6b9d] transition-colors">About</motion.a>
              <motion.div whileHover={{ scale: 1.1, x: 10 }} whileTap={{ scale: 0.95 }}>
                <Link to="/traits" onClick={closeMenu} className="hover:text-[#ff6b9d] transition-colors">Collection</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1, x: 10 }} whileTap={{ scale: 0.95 }}>
                <Link to="/swap" onClick={closeMenu} className="text-[#ff6b9d] hover:text-white transition-colors">Swap</Link>
              </motion.div>
              <motion.a whileHover={{ scale: 1.1, x: 10 }} whileTap={{ scale: 0.95 }} href="#faq" onClick={closeMenu} className="hover:text-[#ff6b9d] transition-colors">FAQ</motion.a>
              <motion.div whileHover={{ scale: 1.1, x: 10 }} whileTap={{ scale: 0.95 }}>
                <Link to="/game" onClick={closeMenu} className="text-[#ff6b9d] hover:text-white transition-colors">Play</Link>
              </motion.div>
            </nav>
            
            <div className="mt-auto pb-10 flex gap-8">
              <motion.a 
                href="https://x.com/the10ksquad" 
                target="_blank" 
                rel="noreferrer"
                whileHover={{ scale: 1.2, color: "#ff6b9d" }}
                className="opacity-50 transition-all"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </motion.a>
              <motion.a 
                href="https://discord.gg/the10ksquad" 
                target="_blank" 
                rel="noreferrer"
                whileHover={{ scale: 1.2, color: "#5865F2" }}
                className="opacity-50 transition-all"
              >
                 <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                 </svg>
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <header className="pt-[140px] pb-20 px-6 sm:px-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-12 md:gap-16">
        <div className="max-w-2xl text-center md:text-left flex flex-col items-center md:items-start">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-10"
          >
            <TransparentLogo src="/logo-hero.png" className="w-[120px] md:w-[200px]" theme={theme} />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl font-black mb-4 md:mb-6 uppercase tracking-tight text-[#ff6b9d]"
          >
            3,333 hand drawn
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-sm sm:text-base md:text-lg opacity-80 font-medium max-w-lg mb-8 leading-relaxed"
          >
            The elite NFT collective on Monad. Expanding boundaries through community, art, and decentralized power.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 w-full sm:w-auto"
          >
            <motion.a 
              href="https://opensea.io/collection/the-10k-squad-350905768" 
              target="_blank" 
              whileHover={{ scale: 1.1, boxShadow: "0 0 40px rgba(255, 107, 157, 0.6)", backgroundColor: "#ff6b9d", color: "#0a0014" }} 
              whileTap={{ scale: 0.95 }}
              className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-black tracking-tight transition-all duration-300 shadow-2xl border w-full sm:w-auto ${
                theme === 'dark' 
                  ? 'bg-[#1a1a1a] text-white border-white/10 hover:border-[#ff6b9d]/30' 
                  : 'bg-white text-black border-black/5 hover:border-black/20 shadow-black/5'
              }`}
            >
              <img src="/opensea.png" alt="OpenSea" className="w-6 h-6 md:w-7 md:h-7 object-contain rounded-full" />
              <span className="text-xl md:text-2xl text-nowrap">Buy on OpenSea</span>
            </motion.a>

            <div className="flex gap-4">
              <motion.a 
                href="https://x.com/the10ksquad" 
                target="_blank" 
                whileHover={{ scale: 1.1, translateY: -2, boxShadow: "0 0 20px rgba(255, 107, 157, 0.25)" }}
                whileTap={{ scale: 0.9 }}
                className={`w-12 h-12 rounded-xl transition-all duration-300 shadow-xl flex items-center justify-center border group ${
                  theme === 'dark' 
                    ? 'bg-[#1a1a1a] text-white border-white/10 hover:border-[#ff6b9d]/30' 
                    : 'bg-white text-black border-black/5 hover:border-black/20 shadow-black/5'
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current transition-all duration-300 group-hover:scale-110"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </motion.a>

              <motion.a 
                href="https://discord.gg/the10ksquad" 
                target="_blank" 
                whileHover={{ scale: 1.1, translateY: -2, boxShadow: "0 0 20px rgba(88, 101, 242, 0.4)" }}
                whileTap={{ scale: 0.9 }}
                className={`w-12 h-12 rounded-xl transition-all duration-300 shadow-xl group/discord flex items-center justify-center border ${
                  theme === 'dark' 
                    ? 'bg-[#1a1a1a] text-white border-white/10 hover:border-[#ff6b9d]/30' 
                    : 'bg-white text-black border-black/5 hover:border-black/20 shadow-black/5'
                }`}
              >
                <svg className={`w-6 h-6 transition-transform duration-300 group-hover/discord:scale-110 ${theme === 'light' ? 'fill-black' : 'fill-white'}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </motion.a>
            </div>
          </motion.div>
        </div>

        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }} 
          animate={{ opacity: 1, scale: 1, rotate: 0 }} 
          transition={{ delay: 0.2 }}
          className="w-full max-w-[320px] sm:max-w-[450px] aspect-square rounded-[3rem] sm:rounded-[4rem] overflow-hidden border-4 sm:border-8 border-current/10 shadow-[0_0_80px_rgba(155,89,182,0.2)]"
        >
          <img 
            src="/hero-main.png" 
            alt="Squad Featured" 
            loading="eager"
            fetchPriority="high"
            className="w-full h-full object-cover" 
          />
        </motion.div>
      </header>
 
 
      {/* COLLECTION STATS */}
      <section className="mt-8 sm:mt-12 mb-8 sm:mb-12 py-4 sm:py-8 max-w-[1000px] mx-auto relative z-10 border-y border-white/5 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-0">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              whileHover={{ y: -3 }}
              className={`flex flex-col items-center justify-center text-center py-4 sm:py-6 group transition-all duration-300 px-2 cursor-default will-change-transform ${
                i % 2 === 0 ? 'border-r border-[#333333] md:border-r' : 'md:border-r border-[#333333]' 
              } last:border-none`}
            >
              <div className={`text-xl sm:text-2xl md:text-[1.8rem] font-bold tracking-tight mb-1 transition-all duration-500 flex items-center justify-center gap-2 ${
                isStatsLoading ? 'opacity-30 blur-[2px]' : 'opacity-100'
              } ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                {stat.value}
                {i === 3 && nftStats.isLive && (
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
              <div className="text-[10px] sm:text-[0.75rem] font-normal uppercase tracking-[0.1em] text-[#777777] group-hover:text-current transition-colors duration-300">
                {stat.label}
              </div>
              {stat.sublabel && (
                <div className="text-[9px] sm:text-[0.7rem] font-normal text-[#777777] mt-0.5 text-center group-hover:text-current transition-colors duration-300 hidden sm:block">
                  {stat.sublabel}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="scroll-mt-32 mb-40 flex flex-col -space-y-20 -mt-10">
        <Marquee items={imagesRow1} theme={theme} />
        <Marquee items={imagesRow2} reverse={true} theme={theme} />
      </section>
 
      {/* WHY HOLD UTILITY */}
      <section id="utility" className="px-6 sm:px-10 max-w-7xl mx-auto mb-24 sm:mb-40 scroll-mt-32">
        <motion.header 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 px-2">WHY HOLD <span className="text-[#ff6b9d]">10K SQUAD</span></h2>
          <div className="h-1.5 w-16 bg-[#ff6b9d] mx-auto rounded-full" />
        </motion.header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            { label: "MAGMA", title: "15% Boost on Points", color: "#FF9F43", x: "https://x.com/MagmaStaking", web: "https://www.magmastaking.xyz/", bg: "/magma_bg.png" },
            { label: "NEVERLAND", title: "20% Boost on Pearls", color: "#B19CD9", x: "https://x.com/Neverland_Money", web: "https://neverland.money/", bg: "/neverland_bg.png" },
            { label: "KINTSU", title: "25% Boost on Points", color: "#00D4FF", x: "https://x.com/Kintsu", web: "https://kintsu.xyz/", bg: "/kintsu_bg.png" },
            { label: "PINGU", title: "30% Boost (2nd Tier)", color: "#9B59B6", x: "https://x.com/PinguExchange", web: "https://pingu.exchange/", bg: "/pingu_bg.png" },
            { label: "SHERPA", title: "Vault Deposit Boost", color: "#1ABC9C", x: "https://x.com/Sherpa_trade", web: "https://www.sherpa.trade/", bg: "/sherpa_bg.png" },
            { label: "BEAN", title: "20% Boost", color: "#2ECC71", x: "https://x.com/Bean_DEX", web: "https://bean.exchange/", bg: "/bean_bg.png" },
            { label: "HAHA WALLET", title: "10% Boost on Karma", color: "#F1C40F", x: "https://x.com/haha_app", web: "https://www.haha.me/", bg: "/haha_bg.png" },
            { label: "FLUFFLE", title: "15 Free Raffle Tickets", color: "#E84393", x: "https://x.com/fluffleworld", web: "https://www.fluffle.world/", bg: "/fluffle_bg.png" },
            { label: "CULTVERSE", title: "20% Gem Boost + Priority", color: "#6C5CE7", x: "https://x.com/cultverse_ai", web: "https://cultverse.ai/", bg: "/cultverse_bg.png" }
          ].map((item, i) => {
            // Mapping for high-quality fallbacks if local image doesn't exist
            const fallbacks: Record<string, string> = {
              "MAGMA": "https://images.unsplash.com/photo-1518457607834-6e8d80c182c1?w=800&q=80",
              "NEVERLAND": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",
              "KINTSU": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
              "PINGU": "https://images.unsplash.com/photo-1517783999520-f068d7431a60?w=800&q=80",
              "SHERPA": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
              "BEAN": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
              "HAHA WALLET": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
              "FLUFFLE": "https://images.unsplash.com/photo-1594498653385-d5172c532c00?w=800&q=80",
              "CULTVERSE": "https://images.unsplash.com/photo-1614728263952-84ea206f0c41?w=800&q=80"
            };

            return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              whileHover={{ y: -10 }}
              className={`p-8 rounded-[2.5rem] border group transition-all duration-500 overflow-hidden relative min-h-[200px] flex flex-col justify-end shadow-2xl will-change-transform ${theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.03] border-black/10'}`}
            >
              {/* BACKGROUND IMAGE WITH GRADIENT OVERLAY */}
              <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-110">
                <img 
                  src={item.bg} 
                  alt="" 
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbacks[item.label] || "https://images.unsplash.com/photo-1614850523296-e811ca9fd093?w=800&q=80";
                  }}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 transition-opacity duration-500 ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-t from-black via-black/60 to-black/10 opacity-70 group-hover:opacity-50' 
                    : 'bg-gradient-to-t from-white via-white/60 to-white/10 opacity-80 group-hover:opacity-60'
                }`} />
              </div>


              {/* CORNER LINKS - Glassmorphism */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2 sm:gap-3 z-20 transition-all duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0">
                <motion.a 
                  href={item.x} 
                  target="_blank" 
                  rel="noreferrer"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 107, 157, 0.2)" }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all shadow-xl"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'fill-white' : 'fill-black'}`}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </motion.a>
                <motion.a 
                  href={item.web} 
                  target="_blank" 
                  rel="noreferrer"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 107, 157, 0.2)" }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all shadow-xl"
                >
                  <Globe size={16} strokeWidth={2.5} className={`sm:hidden ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                  <Globe size={18} className={`hidden sm:block ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                </motion.a>
              </div>

              <div className="relative z-10">
                <motion.div 
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1.05 }}
                  className="w-fit px-5 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] text-white shadow-2xl mb-4 transition-all"
                  style={{ backgroundColor: item.color, boxShadow: `0 10px 30px -10px ${item.color}80` }}
                >
                  {item.label}
                </motion.div>
                <h3 className="text-xl font-black uppercase italic tracking-tight leading-tight group-hover:text-[#ff6b9d] transition-colors duration-300">{item.title}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>
        <div className="mt-16 text-center">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-xl md:text-2xl font-black uppercase italic tracking-[0.3em] opacity-20"
          >
            More COMING SOON
          </motion.div>
        </div>
      </section>
 
      {/* ABOUT */}
      <section id="about" className="px-6 md:px-10 max-w-7xl mx-auto mb-24 sm:mb-40 scroll-mt-32 overflow-hidden">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-16 md:gap-24">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 space-y-6 md:space-y-10 text-center lg:text-left"
          >
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-tight">
              About <span className="text-[#9b59b6]">10k SQUAD</span>
            </h2>
            <div className="h-1 w-20 bg-current rounded-full mx-auto lg:ml-0" />
            <div className="space-y-6 md:space-y-8 text-base sm:text-lg md:text-xl font-medium opacity-60 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              <p>
                The 10K Squad is a collection of 3,333 hand-drawn NFTs on Monad. With vibrant, unique artwork and a fun community vibe, we're building more than just PFPs.
              </p>
              <p>
                We're creating a hub of utilities, rewards, partnerships, and exclusive experiences for the entire Monad ecosystem. Made by the community, for the community.
              </p>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            className="flex-1 w-full max-w-[300px] sm:max-w-[500px]"
          >
            <motion.div 
              whileHover={{ rotate: 3, scale: 1.05 }}
              className="relative aspect-square rounded-[3rem] sm:rounded-[5rem] overflow-hidden border-8 sm:border-[12px] border-current/5 shadow-3xl mx-auto will-change-transform"
            >
              <img src="/about_new.png" alt="Vision" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="px-6 md:px-10 max-w-4xl mx-auto mb-40 mt-32 scroll-mt-32">
        <header className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
            >
              FAQ
            </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-base font-medium uppercase tracking-[0.3em] text-[#777777]"
          >
            Frequently Asked Questions
          </motion.p>
        </header>

        <div className="space-y-2">
          {[
            {
              q: "What is 10K Squad?",
              a: "A collection of 3,333 hand-drawn NFTs on the Monad blockchain. We offer real utility through boosts across multiple DeFi protocols in the Monad ecosystem."
            },
            {
              q: "Where can I buy a 10K Squad NFT?",
              a: "You can purchase on OpenSea. Connect your Monad-compatible wallet (MetaMask, Rabby, etc)."
            },
            {
              q: "How do the boosts work?",
              a: "By holding a 10K Squad NFT, you automatically receive boosts across partner protocols: Magma (15%), Neverland (20%), Kintsu (25%), Pingu (30%), Sherpa (vault deposit), Bean (20%), Haha Wallet (10%), Fluffle (15 raffle tickets), Cultverse (20% gems + priority). No staking required — just hold the NFT."
            },
            {
              q: "What blockchain is 10K Squad on?",
              a: "Monad — an EVM-compatible, high-performance blockchain (10,000 TPS)."
            }
          ].map((faq, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 5 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="group overflow-hidden will-change-transform"
            >
              <details className="appearance-none cursor-pointer">
                <summary className={`flex items-center justify-between p-6 list-none border-b transition-colors duration-300 focus:outline-none ${theme === 'dark' ? 'border-[#333] hover:bg-[#1a1a1a]' : 'border-black/10 hover:bg-black/5'} [&::-webkit-details-marker]:hidden`}>
                  <span className={`text-lg md:text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{faq.q}</span>
                  <div className="relative w-6 h-6">
                    <div className={`absolute top-1/2 left-0 w-full h-0.5 transform -translate-y-1/2 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`} />
                    <div className={`absolute top-0 left-1/2 w-0.5 h-full transform -translate-x-1/2 transition-transform duration-300 group-open:rotate-90 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`} />
                  </div>
                </summary>
                <div className={`p-6 text-base md:text-lg opacity-60 leading-relaxed font-medium transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  {faq.a}
                </div>
              </details>
            </motion.div>
          ))}
        </div>

        {/* CALLOUT BOX */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 p-10 md:p-16 rounded-[2.5rem] relative overflow-hidden text-center group"
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd] to-[#ff69b4] opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
          <div className={`absolute inset-[1px] rounded-[2.5rem] z-0 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`} />
          
          <div className="relative z-10 space-y-6">
            <h3 className={`text-3xl md:text-4xl font-black uppercase italic tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Have more questions?</h3>
            <p className={`text-lg opacity-60 font-medium max-w-md mx-auto ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              Join our Discord community for real-time support, news, and exclusive holder discussions.
            </p>
            <motion.a 
              href="https://discord.gg/the10ksquad" 
              target="_blank"
              whileHover={{ scale: 1.1, translateY: -5, boxShadow: "0 0 30px rgba(88, 101, 242, 0.6)" }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-4 px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-black tracking-tight transition-all duration-300 shadow-2xl"
            >
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>JOIN DISCORD</span>
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <motion.footer 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="px-4 sm:px-10 max-w-7xl mx-auto pb-12 sm:pb-20"
      >
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-24 p-8 sm:p-16 rounded-[3rem] sm:rounded-[5rem] border border-current/10 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
          <div className="space-y-6 sm:space-y-10 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-current/20">
                <img src="/logo.png" alt="Logo" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-nowrap">10K SQUAD</span>
            </div>
            <p className="opacity-40 text-sm sm:text-base font-medium leading-relaxed max-w-xs">
              Hand-drawn excellence on Monad. Expanding boundaries through community and utility.
            </p>
            <div className="flex items-center gap-6 justify-center md:justify-start">
              <motion.a 
                href="https://opensea.io/collection/the-10k-squad-350905768" 
                target="_blank" 
                whileHover={{ scale: 1.4, filter: "drop-shadow(0 0 8px rgba(32, 129, 226, 0.6))" }}
                whileTap={{ scale: 0.9 }}
                className="opacity-50 hover:opacity-100 transition-all"
              >
                <img src="/opensea.png" alt="OpenSea" className="w-6 h-6 object-contain rounded-full" />
              </motion.a>
              <motion.a 
                href="https://x.com/the10ksquad" 
                target="_blank" 
                whileHover={{ scale: 1.4, color: "#ff6b9d" }}
                whileTap={{ scale: 0.9 }}
                className="opacity-50 hover:opacity-100 transition-all"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </motion.a>
              <motion.a 
                href="https://discord.gg/the10ksquad" 
                target="_blank" 
                whileHover={{ scale: 1.4, color: "#5865F2" }}
                whileTap={{ scale: 0.9 }}
                className="opacity-50 hover:opacity-100 transition-all"
              >
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'fill-white' : 'fill-black'}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </motion.a>
            </div>
          </div>
 
          <div className="grid grid-cols-2 gap-8 sm:gap-12 lg:ml-auto w-full text-center md:text-left">
            <div className="space-y-6 sm:space-y-8">
              <h4 className="text-[8px] sm:text-[10px] uppercase font-black tracking-[0.4em] opacity-30">The Squad</h4>
              <nav className="flex flex-col gap-3 sm:gap-5 text-xs sm:text-sm font-black italic opacity-60">
                <a href="#top" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">Home</a>
                <a href="#utility" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">Utility</a>
                <Link to="/traits" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">Collection Explorer</Link>
                <Link to="/swap" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">Token Swap</Link>
                <a href="#about" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">About</a>
              </nav>
            </div>
            <div className="space-y-6 sm:space-y-8">
              <h4 className="text-[8px] sm:text-[10px] uppercase font-black tracking-[0.4em] opacity-30">Ecosystem</h4>
              <nav className="flex flex-col gap-3 sm:gap-5 text-xs sm:text-sm font-black italic opacity-60">
                <a href="#" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">Monad</a>
                <a href="#" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">Governance</a>
                <a href="#" className="hover:opacity-100 hover:text-[#ff6b9d] hover:translate-x-1 transition-all duration-300 uppercase">Partners</a>
              </nav>
            </div>
          </div>
 
          <div className="col-span-full md:col-span-1 lg:col-span-1 flex flex-col justify-end items-center md:items-end mt-4 sm:mt-0">
             <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.5em] opacity-20 mb-3">2026 THE 10K SQUAD</div>
             <div className="text-[10px] sm:text-xs font-black opacity-30">ALL RIGHTS RESERVED.</div>
          </div>
        </div>
      </motion.footer>

      {/* BG DECOR */}
      <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-20%] right-[-10%] w-[70%] aspect-square rounded-full blur-[150px] ${theme === 'dark' ? 'bg-purple-900/10' : 'bg-purple-100/20'}`} />
        <div className={`absolute bottom-[-10%] left-[-20%] w-[60%] aspect-square rounded-full blur-[150px] ${theme === 'dark' ? 'bg-pink-900/10' : 'bg-pink-100/20'}`} />
      </div>
    </div>
  );
}
