import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, ExternalLink, Info } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  available?: boolean;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
    description: 'Connect to your MetaMask Wallet',
    available: true
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    icon: 'https://rabby.io/assets/logo.png', // Fallback URL
    description: 'The game changer wallet for Ethereum users',
    available: true
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: 'https://raw.githubusercontent.com/CoinbaseWallet/coinbase-wallet-sdk/master/packages/wallet-sdk/assets/coinbase-wallet-logo.svg',
    description: 'Safe & secure crypto wallet',
    available: true
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg',
    description: 'Scan with Rainbow, Trust, Argent and more',
    available: true
  }
];

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletId: string) => void;
  theme?: 'light' | 'dark';
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onConnect, theme = 'dark' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative w-full max-w-[420px] rounded-[2.5rem] border overflow-hidden shadow-2xl ${
              theme === 'dark' 
                ? 'bg-[#151f2e] border-white/10 text-white' 
                : 'bg-white border-black/10 text-black'
            }`}
          >
            {/* Header */}
            <div className={`p-8 border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                  Connect <span className="text-[#ff6b9d]">Wallet</span>
                </h2>
                <button 
                  onClick={onClose}
                  className={`p-2 rounded-xl transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/5 opacity-50 hover:opacity-100' : 'hover:bg-black/5 opacity-50 hover:opacity-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs font-bold opacity-40 uppercase tracking-widest">
                Choose your preferred way to connect
              </p>
            </div>

            {/* Options */}
            <div className="p-6 space-y-3">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.id}
                  disabled={!wallet.available}
                  onClick={() => {
                    if (wallet.available) {
                      onConnect(wallet.id);
                      onClose();
                    }
                  }}
                  className={`w-full group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 transform active:scale-[0.98] ${
                    wallet.available 
                      ? theme === 'dark' 
                        ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-[#ff6b9d]/30' 
                        : 'bg-black/5 border-black/5 hover:bg-black/10 hover:border-[#ff6b9d]/30'
                      : 'opacity-40 grayscale cursor-not-allowed'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden p-1.5 transition-transform duration-500 group-hover:rotate-6 ${
                    theme === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'
                  }`}>
                    <img 
                      src={wallet.icon} 
                      alt={wallet.name} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/shapes/svg?seed=' + wallet.id;
                      }}
                    />
                  </div>
                  
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black uppercase italic tracking-tight">{wallet.name}</span>
                      {wallet.available && (
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold opacity-30 tracking-tight leading-tight group-hover:opacity-60 transition-opacity">
                      {wallet.description}
                    </p>
                  </div>

                  {!wallet.available && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/10">
                      <span className="text-[7px] font-black uppercase">Soon</span>
                    </div>
                  )}

                  {wallet.available && (
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer Info */}
            <div className={`p-6 mt-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="flex gap-3 items-start">
                <Info size={16} className="text-[#ff6b9d] mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-medium opacity-60 leading-relaxed italic">
                  Make sure you have selected the <span className="text-[#ff6b9d] font-black">Monad</span> network in your wallet extension after connecting.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
