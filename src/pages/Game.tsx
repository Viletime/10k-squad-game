import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FloatingParticles } from '../App';
import { Volume2, VolumeX, ArrowLeft, Play, Trophy, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, ensureAuth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { playFlipSound, playSuccessSound, playErrorSound, playVictorySound, getMuted, setMuted as saveMutePreference } from '../lib/sounds';

export default function Game() {
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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
        const q = query(
          collection(db, 'leaderboard'),
          orderBy('score', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const scores = querySnapshot.docs.map((doc, i) => {
          const data = doc.data();
          return {
            rank: i + 1,
            player: data.name,
            time: data.time,
            diff: data.difficulty,
            score: data.score
          };
        });
        setLeaderboard(scores);
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

    setIsSaving(true);
    setSaveError('');

    try {
      // The rules are set up to allow public creation with validation, 
      // so we don't strictly need to ensureAuth() here which might hang if not configured.
      const scoreData = {
        name: playerName.trim(),
        score: Math.floor(finalScore),
        difficulty: difficulty,
        time: time,
        moves: turns,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'leaderboard'), scoreData);
      setIsSaving(false);
      setShowLeaderboardScreen(true);
    } catch (error) {
      setIsSaving(false);
      setSaveError('Error saving. Try again!');
      handleFirestoreError(error, OperationType.CREATE, 'leaderboard');
    }
  };

  return (
    <div className={`min-h-screen relative transition-colors duration-500 overflow-x-hidden ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <FloatingParticles />
      
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 backdrop-blur-md bg-black/60 border-b border-white/10 flex justify-between items-center text-white">
        <Link to="/" className="flex items-center gap-3 group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xl font-black uppercase italic tracking-tighter">BACK TO SQUAD</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="px-4 py-1.5 rounded-full bg-[#ff6b9d] text-white text-xs font-black tracking-widest shadow-lg">
            GAME CENTER
          </div>
        </div>
      </nav>

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
            <div className="w-full flex flex-wrap md:flex-nowrap items-center mb-8 gap-4 px-2">
              <div className="flex items-center gap-4 shrink-0">
                {/* Sound Toggle */}
                <button
                  onClick={() => {
                    const newMuted = !isMuted;
                    setIsMuted(newMuted);
                    saveMutePreference(newMuted);
                  }}
                  className={`w-[45px] h-[45px] flex shrink-0 items-center justify-center rounded-[15px] border-2 border-[#ff6b9d] transition-all hover:bg-[#ff6b9d] hover:text-white ${theme === 'dark' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}`}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                {/* Difficulty Dropdown */}
                <div className="relative z-20 shrink-0">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`min-w-[180px] h-[45px] px-4 py-3 rounded-[15px] border-2 border-[#ff6b9d] flex justify-between items-center transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,107,157,0.3)] ${theme === 'dark' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}`}
                  >
                    <span className="font-bold uppercase tracking-widest text-[12px] whitespace-nowrap">
                      {difficulty} {getDifficultySettings().grid} · {getDifficultySettings().multiplier}
                    </span>
                    <span className={`ml-2 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {isDropdownOpen && (
                    <ul className={`absolute top-full left-0 w-full mt-1 border-2 border-[#ff6b9d] border-t-0 rounded-b-[15px] overflow-hidden shadow-2xl z-50 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                      {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => {
                        const settings = diff === 'EASY' ? { grid: '4x3', mult: '1x' } : diff === 'MEDIUM' ? { grid: '4x4', mult: '1.5x' } : { grid: '6x4', mult: '2x' };
                        return (
                          <li
                            key={diff}
                            onClick={() => {
                              handleDifficultyChange(diff);
                              setIsDropdownOpen(false);
                            }}
                            className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-all hover:bg-[#ff6b9d]/20 border-b border-[#ff6b9d]/10 last:border-0 ${difficulty === diff ? 'bg-[#ff6b9d]/30 font-bold' : ''}`}
                          >
                            <span className="uppercase tracking-widest text-[10px]">
                              {diff} <span className="opacity-50 ml-2 font-normal italic">{settings.grid} · {settings.mult}</span>
                            </span>
                            {difficulty === diff && <span className="text-[#ff6b9d]">✓</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  
                  {msg && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 left-0 right-0 text-center text-[#ff6b9d] text-[10px] font-black uppercase italic tracking-widest"
                    >
                      {msg}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Stats Box (One Line) */}
              <div className={`flex-1 p-3 min-h-[45px] rounded-[15px] border-2 border-[#ff6b9d] flex items-center justify-around gap-4 md:gap-6 font-mono transition-colors duration-500 overflow-x-auto custom-scrollbar ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[#ffffff] text-[10px] uppercase font-bold">TIME:</span>
                  <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{formatTime(time)}</span>
                </div>
                <span className="text-[#ff6b9d]/50">|</span>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[#9b59b6] text-[10px] uppercase font-bold">MOVES:</span>
                  <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{turns}</span>
                </div>
                <span className="text-[#ff6b9d]/50">|</span>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[#ff6b9d] text-[10px] uppercase font-bold">SCORE:</span>
                  <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{score}</span>
                </div>
                <span className="text-[#FFD700] text-[10px] uppercase font-bold">|</span>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[#FFD700] text-[10px] uppercase font-bold">COMBO:</span>
                  <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>x{combo}</span>
                </div>
              </div>
            </div>

            <div className="relative w-full min-h-[400px] flex flex-col items-center justify-center">
              {!allMatched && !showLeaderboardScreen && (
                <>
                  <div className={`grid ${getDifficultySettings().cols} gap-3 w-full`}>
                    {cards.map(card => (
                      <div key={card.id} className={`relative aspect-square transition-all duration-500 ${card.matched ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100'}`}>
                        <div className={`w-full h-full cursor-pointer transition-all duration-500 [transform-style:preserve-3d] ${card === choiceOne || card === choiceTwo || card.matched ? '[transform:rotateY(180deg)]' : ''}`}
                          onClick={() => !disabled && !card.matched && card !== choiceOne && handleChoice(card)}
                        >
                          {/* Front of card (SQUAD) */}
                          <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl border-2 border-current/10 bg-current/5 flex items-center justify-center [transform:rotateY(180deg)] overflow-hidden">
                              <img src={card.src} alt="card front" className="w-full h-full object-cover" />
                          </div>
                          {/* Back of card */}
                          <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl border-2 border-current/10 bg-[#0f0f0f] flex items-center justify-center overflow-hidden">
                              <img src="/card-back-owl.png" alt="card back" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botões */}
                  <div className="mt-8 flex gap-4 w-full justify-center">
                    <button 
                      onClick={() => shuffleCards()}
                      className="px-8 py-3 rounded-[15px] border border-[#ff6b9d] text-[#ff6b9d] font-black uppercase text-xs tracking-widest hover:bg-[#ff6b9d] hover:text-white transition-all"
                    >
                      Reset Game
                    </button>
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
                    <button 
                      onClick={handleSaveScore}
                      disabled={isSaving}
                      className={`flex-1 py-4 bg-[#ff6b9d] text-white rounded-[15px] font-black uppercase text-xs tracking-widest transition-all shadow-xl ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                    >
                      {isSaving ? 'Saving...' : 'Save Score'}
                    </button>
                    {saveError && (
                      <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{saveError}</p>
                    )}
                    <button 
                      onClick={() => shuffleCards()}
                      disabled={isSaving}
                      className={`flex-1 py-4 border rounded-[15px] font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform ${
                        theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-black/10 text-black hover:bg-black/5'
                      }`}
                    >
                      New Game
                    </button>
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
                    <button 
                      onClick={() => shuffleCards()}
                      className="flex-1 py-4 bg-[#ff6b9d] text-white rounded-[15px] font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform shadow-xl"
                    >
                      New Game
                    </button>
                    <Link 
                      to="/"
                      className={`flex-1 flex items-center justify-center py-4 border rounded-[15px] font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform ${
                        theme === 'dark' ? 'border-white/10 text-white hover:bg-white/5' : 'border-black/10 text-black hover:bg-black/5'
                      }`}
                    >
                      Back Home
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* LEADERBOARD SIDEBAR */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-6 rounded-[2.5rem] border border-current/10 backdrop-blur-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}
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

      <footer className="py-10 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">
        2026 THE 10K SQUAD GAME CENTER
      </footer>
    </div>
  );
}
