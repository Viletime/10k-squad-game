import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FloatingParticles } from '../App';
import { Volume2, VolumeX, ArrowLeft, Play, Trophy, Users, Zap, Sun as SunIcon, Moon as MoonIcon, Wallet, Menu, X, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../lib/WalletContext';
import { playFlipSound, playSuccessSound, playErrorSound, playVictorySound, getMuted, setMuted as saveMutePreference } from '../lib/sounds';

const GAME_CONTRACT_ADDRESS = "0xAe2CA5D3A67D5096743e6e336f0ad001762fE7f3";
const GAME_CONTRACT_ABI = [
  // Assuming you created a function like this to save
  "function saveScore(string playerName, uint256 score, string difficulty, uint256 time) public",
  // And a function to get the leaderboard, if it exists
  "function getTopScores() public view returns (tuple(string playerName, uint256 score, string difficulty, uint256 time)[])"
];

export default function Game() {
  const { account, disconnectWallet, setIsModalOpen, isModalOpen, connectWallet } = useWallet();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMuted, setIsMuted] = useState(getMuted());
  const [isPlaying, setIsPlaying] = useState(true);
  const [cards, setCards] = useState<{id: number, src: string, matched: boolean}[]>([]);
  const [turns, setTurns] = useState(0);
  const [choiceOne, setChoiceOne] = useState<{id: number, src: string, matched: boolean} | null>(null);
  const [choiceTwo, setChoiceTwo] = useState<{id: number, src: string, matched: boolean} | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showLeaderboardScreen, setShowLeaderboardScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [msg, setMsg] = useState('');
  const [leaderboard, setLeaderboard] = useState<{rank: number, player: string, time: number, diff: string}[]>([]);

  const mockLeaderboard = [
    { rank: 1, player: "0x1a2b...9c4d", time: 45, diff: "HARD" },
    { rank: 2, player: "0x3e4f...1a2b", time: 52, diff: "HARD" },
    { rank: 3, player: "0x5f6a...3b4c", time: 63, diff: "MEDIUM" },
    { rank: 4, player: "0x7b8c...5d6e", time: 72, diff: "MEDIUM" },
    { rank: 5, player: "0x9d0e...7f8a", time: 78, diff: "EASY" },
    { rank: 6, player: "0x1c2d...9e0f", time: 85, diff: "MEDIUM" },
    { rank: 7, player: "0x3f4a...1b2c", time: 91, diff: "EASY" },
    { rank: 8, player: "0x5b6c...3d4e", time: 98, diff: "HARD" },
    { rank: 9, player: "0x7d8e...5f6a", time: 102, diff: "MEDIUM" },
    { rank: 10, player: "0x9f0a...7b8c", time: 110, diff: "EASY" },
  ];

  const allCardImages = [
    { "src": "/gamephoto1.png" },
    { "src": "/gamephoto2.png" },
    { "src": "/gamephoto3.png" },
    { "src": "/gamephoto4.png" },
    { "src": "/gamephoto5.png" },
    { "src": "/gamephoto6.png" },
    { "src": "/gamephoto7.png" },
    { "src": "/gamephoto8.png" },
    { "src": "/gamephoto9.png" },
    { "src": "/gamephoto10.png" },
    { "src": "/gamephoto11.png" },
    { "src": "/gamephoto12.png" }
  ];

  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'EASY': return { pairs: 6, cols: 'grid-cols-3 sm:grid-cols-4', time: 1000, grid: '4x3', multiplier: '1x' };
      case 'HARD': return { pairs: 12, cols: 'grid-cols-4 sm:grid-cols-6', time: 600, grid: '6x4', multiplier: '2x' };
      default: return { pairs: 8, cols: 'grid-cols-4', time: 800, grid: '4x4', multiplier: '1.5x' };
    }
  };

  // Shuffle cards
  const shuffleCards = (newDiff?: 'EASY' | 'MEDIUM' | 'HARD') => {
    const diffToUse = newDiff || difficulty;
    let settings = { pairs: 8 };
    if (diffToUse === 'EASY') settings = { pairs: 6 };
    if (diffToUse === 'HARD') settings = { pairs: 12 };
    
    // Pick unique images
    const pickedImages = allCardImages.slice(0, settings.pairs);
    
    const shuffledCards = [...pickedImages, ...pickedImages]
      .sort(() => Math.random() - 0.5)
      .map((card) => ({ ...card, id: Math.random(), matched: false }));

    setChoiceOne(null);
    setChoiceTwo(null);
    setCards(shuffledCards);
    setTurns(0);
    setTime(0);
    setScore(0);
    setCombo(0);
    setTimerActive(false);
    setShowLeaderboardScreen(false);
    setFinalScore(0);
    setPlayerName('');
    
    if (newDiff) {
      setMsg(`Difficulty set to ${newDiff}`);
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const handleDifficultyChange = (newDiff: 'EASY' | 'MEDIUM' | 'HARD') => {
    setDifficulty(newDiff);
    shuffleCards(newDiff);
  };

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateScore = (turns: number, time: number, diff: string) => {
    let base = 1000;
    if (diff === 'MEDIUM') base = 1500;
    if (diff === 'HARD') base = 2500;
    
    // Penalties for turns and time
    const score = base - (turns * 15) - (time * 3);
    return Math.max(100, score); // At least 100 points for completion
  };

  // Handle choice
  const handleChoice = (card: {id: number, src: string, matched: boolean}) => {
    if (disabled) return;
    if (!account && !isGuest) {
      setMsg('Connect wallet or play as guest!');
      setTimeout(() => setMsg(''), 2000);
      setIsModalOpen(true);
      return;
    }
    playFlipSound();
    if (!timerActive && !allMatched) setTimerActive(true);
    choiceOne ? setChoiceTwo(card) : setChoiceOne(card);
  };

  // Compare 2 selected cards
  useEffect(() => {
    if (choiceOne && choiceTwo) {
      setDisabled(true);
      if (choiceOne.src === choiceTwo.src) {
        playSuccessSound();
        setScore(prev => prev + 100 + (combo * 50));
        setCombo(prev => prev + 1);
        setCards(prevCards => {
          return prevCards.map(card => {
            if (card.src === choiceOne.src) {
              return { ...card, matched: true };
            } else {
              return card;
            }
          });
        });
        resetTurn();
      } else {
        playErrorSound();
        setCombo(0);
        setTimeout(() => resetTurn(), getDifficultySettings().time);
      }
    }
  }, [choiceOne, choiceTwo]);

  // Reset choices & increase turn
  const resetTurn = () => {
    setChoiceOne(null);
    setChoiceTwo(null);
    setTurns(prevTurns => prevTurns + 1);
    setDisabled(false);
  };

  // Start initial game
  useEffect(() => {
    shuffleCards();
  }, []);

  useEffect(() => {
    // Sync theme with local storage or just default to dark for game
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const allMatched = cards.length > 0 && cards.every(card => card.matched);

  // Load leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        if (!(window as any).ethereum) return;
        
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, provider);
        
        try {
          // Try to read from the contract if the getTopScores function exists
          const scoresData = await contract.getTopScores();
          const formattedScores = scoresData.map((item: any, i: number) => ({
            rank: i + 1,
            player: item.playerName,
            time: Number(item.time),
            diff: item.difficulty,
            score: Number(item.score)
          }));
          setLeaderboard(formattedScores);
        } catch (contractErr) {
          console.warn("Contract might not have getTopScores(), using mock fallback for now.", contractErr);
          setLeaderboard(mockLeaderboard);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };
    
    fetchLeaderboard();
  }, [showLeaderboardScreen]);

  useEffect(() => {
    if (allMatched) {
      setTimerActive(false);
      playVictorySound();
      // For the final display, we can use the current score or recalculate
      setFinalScore(score);
    }
  }, [allMatched]);

  const handleSaveScore = async () => {
    if (!playerName.trim()) {
      setMsg('Enter a name!');
      setTimeout(() => setMsg(''), 2000);
      return;
    }
    
    if (!account) {
      setMsg('Connect your wallet in the Navbar first!');
      setTimeout(() => setMsg(''), 2000);
      setIsModalOpen(true);
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      if (!(window as any).ethereum) throw new Error("No Web3 wallet found. Please install a wallet.");
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
      
      // Calling the contract function to save the score on the blockchain!
      const tx = await contract.saveScore(
        playerName.trim(), 
        BigInt(Math.floor(finalScore)), 
        difficulty, 
        BigInt(time)
      );
      
      setMsg('Saving to blockchain... Please wait');
      await tx.wait(); // Wait for the transaction to be mined
      
      setIsSaving(false);
      setShowLeaderboardScreen(true);
      setMsg('');
    } catch (error: any) {
      console.error("Error saving to Ethereum contract", error);
      setIsSaving(false);
      
      if (error.code === 'ACTION_REJECTED') {
        setSaveError('You rejected the transaction!');
      } else {
        setSaveError('Contract error: ' + (error.reason || error.message || 'Check the ABI.'));
      }
    }
  };

  return (
    <div className={`min-h-screen relative transition-colors duration-500 overflow-x-hidden ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <FloatingParticles />
      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 transition-all duration-300 border-b flex justify-between items-center ${
        isScrolled 
          ? `backdrop-blur-xl ${theme === 'dark' ? 'bg-black/80 border-[#ff6b9d]/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-white' : 'bg-white/80 border-black/10 shadow-lg text-black'}`
          : `bg-transparent border-transparent ${theme === 'dark' ? 'text-white' : 'text-black'}`
      }`}>
        <Link to="/" className="flex items-center gap-3 group px-4 py-2 rounded-xl transition-all hover:bg-white/10 hover:shadow-lg active:scale-95">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xl font-black uppercase italic tracking-tighter">BACK TO SQUAD</span>
        </Link>
        <div className={`flex items-center gap-3 sm:gap-6 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          {account ? (
             <div className="hidden sm:flex items-center gap-2">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-current/10 bg-current/5">
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
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
            className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 cursor-pointer p-2"
          >
            {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
          </motion.button>

          {/* MOBILE MENU BUTTON */}
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMenu} 
            className="sm:hidden opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300 cursor-pointer p-2"
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
            className="fixed inset-0 z-[40] pt-[100px] bg-black flex flex-col items-center justify-start gap-8 p-10 text-white sm:hidden"
          >
            <nav className="flex flex-col items-center gap-8 text-xl uppercase font-black italic tracking-widest text-center">
              <Link to="/#top" onClick={closeMenu} className="hover:text-[#ff6b9d]">Home</Link>
              
              {!account && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200"
                >
                  <Wallet size={18} />
                  Connect Wallet
                </motion.button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {!account && !isGuest ? (
        <main className="pt-28 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
          <div className={`p-10 rounded-[3rem] border shadow-2xl flex flex-col items-center justify-center gap-6 max-w-[400px] text-center w-full min-h-[300px] ${theme === 'dark' ? 'bg-[#0a0014]/90 backdrop-blur-xl border-[#ff6b9d]/30 text-white' : 'bg-white/90 backdrop-blur-xl border-2 border-[#ff6b9d] text-black'}`}>
             <Wallet size={64} className="text-[#ff6b9d] mb-2" />
             <h3 className="text-3xl font-black uppercase italic tracking-tighter text-[#ff6b9d]">ACCESS DENIED</h3>
             <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Connect your wallet to save scores on-chain, or play as a guest.</p>
             <div className="flex flex-col gap-3 w-full">
               <motion.button
                 whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255,107,157,0.4)" }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => setIsModalOpen(true)}
                 className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-[15px] text-sm font-black uppercase tracking-widest bg-[#ff6b9d] text-white transition-all hover:bg-[#ff4f8b]"
               >
                 <Wallet size={18} />
                 Connect Wallet
               </motion.button>
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => setIsGuest(true)}
                 className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-[15px] text-sm font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
               >
                 Play as Guest
               </motion.button>
             </div>
          </div>
        </main>
      ) : (
      <main className="pt-28 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-4">
            SQUAD <span className="text-[#9b59b6]">MEMORY</span>
          </h1>
          <p className="text-lg opacity-60 max-w-2xl mx-auto font-medium">
            Match the squad members to earn points.
          </p>
        </motion.div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12 items-start">
          <div className="flex flex-col items-center w-full">
            <div className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-center mb-8 gap-4 px-2">
              {/* STATS PILL */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className={`flex-[1.2] min-h-[70px] rounded-[2rem] border-2 border-white/10 flex items-center justify-between px-4 sm:px-6 py-3 font-mono transition-all duration-500 shadow-xl flex-wrap sm:flex-nowrap gap-2 sm:gap-0 ${theme === 'dark' ? 'bg-[#2a1d35]/60 backdrop-blur-xl' : 'bg-gray-100/80 backdrop-blur-xl'}`}
              >
                <div className="flex flex-col items-center gap-0.5 flex-1 p-1 min-w-[70px]">
                  <span className="text-[#ff6b9d] text-[8px] sm:text-[9px] uppercase font-black tracking-widest opacity-80">SCORE</span>
                  <span className={`text-base sm:text-lg lg:text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-black font-bold'}`}>{score}</span>
                </div>
                <div className="w-[1px] h-6 sm:h-8 bg-white/10 shrink-0 hidden sm:block" />
                <div className="flex flex-col items-center gap-0.5 flex-1 p-1 min-w-[70px]">
                  <span className="text-[#FFD700] text-[8px] sm:text-[9px] uppercase font-black tracking-widest opacity-80">COMBO</span>
                  <span className={`text-base sm:text-lg lg:text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-black font-bold'}`}>x{combo}</span>
                </div>
                <div className="w-[1px] h-6 sm:h-8 bg-white/10 shrink-0 hidden sm:block" />
                <div className="flex flex-col items-center gap-0.5 flex-1 p-1 min-w-[70px]">
                  <span className="text-[#ff6b9d] text-[8px] sm:text-[9px] uppercase font-black tracking-widest opacity-80">TIME</span>
                  <span className={`text-base sm:text-lg lg:text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-black font-bold'}`}>{formatTime(time)}</span>
                </div>
                <div className="w-[1px] h-6 sm:h-8 bg-white/10 shrink-0 hidden sm:block" />
                <div className="flex flex-col items-center gap-0.5 flex-1 p-1 min-w-[70px]">
                  <span className="text-[#ff6b9d] text-[8px] sm:text-[9px] uppercase font-black tracking-widest opacity-80">MOVES</span>
                  <span className={`text-base sm:text-lg lg:text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-black font-bold'}`}>{turns}</span>
                </div>
              </motion.div>

              {/* CONTROLS PILL */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className={`flex-1 min-h-[70px] rounded-[2rem] border-2 border-white/10 relative transition-all duration-500 shadow-lg z-[40] ${theme === 'dark' ? 'bg-[#2a1d35]/40 backdrop-blur-sm' : 'bg-gray-100/60 backdrop-blur-sm'}`}
              >
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 bg-transparent z-10 w-full text-center">
                  <span className="text-[#ff6b9d] text-[8px] font-black uppercase tracking-[0.2em] opacity-70">DIFFICULTY</span>
                </div>

                <div className="flex items-center h-full px-4 sm:px-6 py-2">
                  <div className="relative flex-1">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full max-w-[200px] h-11 flex items-center justify-center gap-2 mx-auto transition-all hover:opacity-80 active:scale-95`}
                    >
                      <span className={`text-[12px] sm:text-sm md:text-base font-bold tracking-tight uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        {difficulty} <span className="opacity-40 text-[10px] ml-1 tracking-normal font-medium">· {getDifficultySettings().grid}</span>
                      </span>
                      <span className={`text-[#ff6b9d] text-[10px] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.ul 
                          initial={{ opacity: 0, y: -10, x: '-50%' }}
                          animate={{ opacity: 1, y: 0, x: '-50%' }}
                          exit={{ opacity: 0, y: -10, x: '-50%' }}
                          className={`absolute top-full left-1/2 w-52 mt-3 border-2 border-[#ff6b9d]/60 rounded-2xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-[9999] transition-colors duration-500 py-1 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}
                        >
                          {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => {
                            const settings = diff === 'EASY' ? { grid: '4x3' } : diff === 'MEDIUM' ? { grid: '4x4' } : { grid: '6x4' };
                            return (
                              <li
                                key={diff}
                                onClick={() => {
                                  handleDifficultyChange(diff);
                                  setIsDropdownOpen(false);
                                }}
                                className={`px-4 py-4 flex justify-center items-center cursor-pointer transition-all hover:bg-[#ff6b9d]/20 border-b border-white/5 last:border-0 relative group/item ${difficulty === diff ? 'bg-[#ff6b9d]/10' : ''}`}
                              >
                                <span className={`uppercase tracking-widest text-sm font-bold transition-transform group-hover/item:scale-110 ${difficulty === diff ? 'text-[#ff6b9d]' : (theme === 'dark' ? 'text-white' : 'text-black')}`}>
                                  {diff} <span className="opacity-40 ml-2 font-normal italic text-[10px] tracking-normal">{settings.grid}</span>
                                </span>
                                {difficulty === diff && <span className="text-[#ff6b9d] text-xs absolute right-4">✓</span>}
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="w-[1px] h-6 bg-white/10 mx-4 shrink-0" />

                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.2, rotate: 180 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => shuffleCards()}
                      className="text-white/40 hover:text-[#ff6b9d] transition-colors p-1.5"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                      </svg>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        const newMuted = !isMuted;
                        setIsMuted(newMuted);
                        saveMutePreference(newMuted);
                      }}
                      className="text-white/40 hover:text-[#ff6b9d] transition-colors p-1.5"
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </motion.button>
                  </div>
                </div>

                {msg && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-5 left-0 right-0 text-center text-[#ff6b9d] text-[8px] font-black uppercase italic tracking-widest"
                  >
                    {msg}
                  </motion.div>
                )}
              </motion.div>
            </div>

            <div className="relative w-full min-h-[400px] flex flex-col items-center justify-center">
              {!allMatched && !showLeaderboardScreen && (
                <>
                  <div className={`grid ${getDifficultySettings().cols} gap-2 sm:gap-3 w-full z-0 relative px-2 sm:px-0`}>
                    {cards.map((card, i) => (
                      <motion.div 
                        key={card.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ 
                          opacity: card.matched ? 0 : 1, 
                          scale: card.matched ? 0.8 : 1,
                          y: 0 
                        }}
                        transition={{ 
                          opacity: { duration: 0.4 },
                          scale: { duration: 0.4 },
                          y: { delay: 0.2 + (i * 0.03), duration: 0.3 }
                        }}
                        whileHover={!card.matched ? { scale: 1.05, y: -5 } : {}}
                        whileTap={!card.matched ? { scale: 0.95 } : {}}
                        className={`relative aspect-square will-change-transform ${card.matched ? 'pointer-events-none' : ''}`}
                      >
                        <div className={`w-full h-full cursor-pointer transition-all duration-500 [transform-style:preserve-3d] ${card === choiceOne || card === choiceTwo || card.matched ? '[transform:rotateY(180deg)]' : ''}`}
                          onClick={() => !disabled && !card.matched && card !== choiceOne && handleChoice(card)}
                        >
                          {/* Front of card (SQUAD) */}
                          <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl border-2 border-current/10 bg-current/5 flex items-center justify-center [transform:rotateY(180deg)] overflow-hidden">
                              <img src={card.src} alt="card front" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          </div>
                          {/* Back of card */}
                          <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl border-2 border-current/10 bg-[#0f0f0f] flex items-center justify-center overflow-hidden">
                              <img src="/card-back-owl.png" alt="card back" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-8 flex gap-4 w-full justify-center">
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255, 107, 157, 0.4)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => shuffleCards()}
                      className="px-8 py-3 rounded-[15px] border border-[#ff6b9d] text-[#ff6b9d] font-black uppercase text-xs tracking-widest hover:bg-[#ff6b9d] hover:text-white transition-all duration-300"
                    >
                      Reset Game
                    </motion.button>
                  </div>
                </>
              )}

              {allMatched && !showLeaderboardScreen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-10 rounded-[2rem] text-white flex flex-col items-center gap-6 shadow-3xl w-full max-w-[500px] transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0014] border border-[#ff6b9d]/30' : 'bg-white border-2 border-[#ff6b9d] text-black'}`}
                >
                   <h2 className="text-4xl font-black uppercase italic tracking-tighter text-[#ff6b9d]">YOU WON!</h2>
                  
                  <div className={`w-full p-6 rounded-2xl border flex flex-col gap-3 text-left ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#ff6b9d]/20' : 'bg-gray-50 border-[#ff6b9d]/50'}`}>
                    <p className="font-black text-xs uppercase tracking-[0.2em] text-[#ff6b9d]">
                      {difficulty} {difficulty === 'EASY' ? '4x3' : difficulty === 'MEDIUM' ? '4x4' : '6x4'}
                    </p>
                    <div className="flex justify-between items-center border-b border-current/10 pb-2">
                       <span className="text-[10px] uppercase font-bold text-[#ffffff]">TIME:</span>
                       <span className="font-mono font-bold text-lg">{formatTime(time)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-current/10 pb-2">
                       <span className="text-[10px] uppercase font-bold text-[#9b59b6]">MOVES:</span>
                       <span className="font-mono font-bold text-lg">{turns}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-current/10 pb-2">
                       <span className="text-[10px] uppercase font-bold text-[#FFD700]">COMBO:</span>
                       <span className="font-mono font-bold text-lg">x{combo}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 font-black">
                       <span className="text-[10px] uppercase tracking-widest text-[#ff6b9d]">SCORE:</span>
                       <span className="text-2xl text-[#4ade80]">{finalScore}</span>
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-left px-1">Enter your name:</label>
                    <input 
                      type="text" 
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Your name here..."
                      maxLength={20}
                      className={`w-full px-5 py-3 rounded-[15px] border outline-none transition-all ${
                        theme === 'dark' 
                          ? 'bg-[#1a1a1a] border-[#ff6b9d]/30 focus:border-[#ff6b9d] text-white' 
                          : 'bg-white border-[#ff6b9d]/50 focus:border-[#ff6b9d] text-black'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <motion.button 
                      whileHover={!isSaving ? { scale: 1.05, boxShadow: "0 0 25px rgba(255, 107, 157, 0.5)" } : {}}
                      whileTap={!isSaving ? { scale: 0.95 } : {}}
                      onClick={handleSaveScore}
                      disabled={isSaving}
                      className={`flex-1 py-4 bg-[#ff6b9d] text-white rounded-[15px] font-black uppercase text-xs tracking-widest transition-all shadow-xl ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                    >
                      {isSaving ? 'Saving...' : 'Save Score'}
                    </motion.button>
                    {saveError && (
                      <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{saveError}</p>
                    )}
                    <motion.button 
                      whileHover={{ scale: 1.05, backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => shuffleCards()}
                      disabled={isSaving}
                      className={`flex-1 py-4 border rounded-[15px] font-black uppercase text-xs tracking-widest transition-all ${
                        theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'
                      }`}
                    >
                      New Game
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {showLeaderboardScreen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-10 rounded-[2rem] flex flex-col items-center gap-6 shadow-3xl w-full max-w-[500px] transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0014] border border-[#ff6b9d]/30 text-white' : 'bg-white border-2 border-[#ff6b9d] text-black'}`}
                >
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-[#ff6b9d]">LEADERBOARD</h2>
                  
                  <div className="w-full overflow-y-auto max-h-[400px] pr-2 space-y-8 flex flex-col items-center custom-scrollbar">
                    {['EASY', 'MEDIUM', 'HARD'].map((diff) => {
                      const data = leaderboard.filter(s => s.diff === diff);
                      return (
                        <div key={diff} className="w-full">
                          <h3 className="text-xs font-black text-[#ff6b9d] uppercase tracking-[0.3em] mb-4 text-center border-b border-[#ff6b9d]/20 pb-2">
                             {diff} ({diff === 'EASY' ? '4x3' : diff === 'MEDIUM' ? '4x4' : '6x4'})
                          </h3>
                          <div className="space-y-2">
                            {data.length > 0 ? data.slice(0, 3).map((entry: any, i: number) => (
                              <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                                <div className="flex items-center gap-3">
                                  <span className="font-black italic text-[#ff6b9d]">{i + 1}º</span>
                                  <span className="font-bold text-sm uppercase tracking-tight">{entry.player}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-black text-[#4ade80]">{entry.score} pts</div>
                                  <div className="text-[9px] opacity-40 font-mono uppercase">{formatTime(entry.time)} | {entry.moves || 0} moves</div>
                                </div>
                              </div>
                            )) : (
                              <p className="text-[10px] opacity-30 italic text-center py-2">No scores yet</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 w-full mt-4">
                    <motion.button 
                      whileHover={{ scale: 1.05, backgroundColor: "#ff6b9d", boxShadow: "0 0 25px rgba(255, 107, 157, 0.5)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => shuffleCards()}
                      className="flex-1 py-4 bg-[#ff6b9d] text-white rounded-[15px] font-black uppercase text-xs tracking-widest transition-all shadow-xl"
                    >
                      New Game
                    </motion.button>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                      <Link 
                        to="/"
                        className={`w-full flex items-center justify-center py-4 border rounded-[15px] font-black uppercase text-xs tracking-widest transition-all ${
                          theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-black/10 text-black hover:bg-black/5'
                        }`}
                      >
                        Back Home
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* LEADERBOARD SIDEBAR */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`p-6 rounded-[2.5rem] border border-current/10 backdrop-blur-xl will-change-transform ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}
          >
            <div className="flex flex-col gap-1 mb-6">
              <h2 className={`text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                🏆 LEADERBOARDS
              </h2>
              <p className="text-[10px] opacity-50 uppercase font-black tracking-widest">Top weekly runners earn $MON tokens.</p>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[30px_1fr_60px_60px] gap-2 px-4 py-2 text-[10px] font-black uppercase opacity-30 italic">
                <div>#</div>
                <div>Player</div>
                <div className="text-right">Time</div>
                <div className="text-right">Mode</div>
              </div>

              {leaderboard.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-[30px_1fr_60px_60px] gap-2 px-4 py-3 rounded-xl border border-current/10 items-center transition-colors group hover:bg-current/5 ${
                    idx < 3 ? (theme === 'dark' ? 'bg-gradient-to-r from-white/5 to-transparent' : 'bg-gradient-to-r from-black/5 to-transparent') : ''
                  }`}
                >
                  <div className={`text-xs font-black italic ${
                    idx === 0 ? 'text-[#F1C40F]' : idx === 1 ? 'text-[#BDC3C7]' : idx === 2 ? 'text-[#E67E22]' : 'opacity-40'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${item.rank}`}
                  </div>
                  <div className={`text-[11px] font-mono opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {item.player}
                  </div>
                  <div className={`text-[11px] font-mono text-right opacity-80 group-hover:opacity-100 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {formatTime(item.time)}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                      item.diff === 'HARD' ? 'bg-[#ff4b4b]/20 text-[#ff4b4b]' : 
                      item.diff === 'MEDIUM' ? 'bg-[#ffb347]/20 text-[#ffb347]' : 
                      'bg-[#4ade80]/20 text-[#4ade80]'
                    }`}>
                      {item.diff}
                    </span>
                    {(item as any).score && (
                      <span className="text-[9px] font-bold text-[#4ade80] mt-1">{(item as any).score}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>


      </main>
      )}

      <footer className="py-10 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">
        2026 THE 10K SQUAD GAME CENTER
      </footer>
    </div>
  );
}
