import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';

interface WalletContextType {
  account: string | null;
  connectWallet: (walletId?: string) => Promise<void>;
  disconnectWallet: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const MONAD_NETWORK = {
  chainId: '0x8f', // Monad Mainnet (143)
  name: 'Monad Mainnet',
  symbol: 'MON',
  rpc: 'https://rpc.monad.xyz', 
  explorer: 'https://monadscan.com/'
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reown hooks
  const { open: openAppKit } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect: disconnectAppKit } = useDisconnect();

  // Keep account state synced with Reown AppKit if user connected via Reown
  useEffect(() => {
    if (isConnected && address) {
      setAccount(address);
    }
  }, [isConnected, address]);

  // Also clear state if Reown was disconnected
  useEffect(() => {
    if (!isConnected && account && account === address) {
      setAccount(null);
    }
  }, [isConnected]);

  useEffect(() => {
    const checkConnection = async () => {
      // Don't override if already connected via Reown
      if (isConnected && address) {
        setAccount(address);
        return;
      }
      
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum as any);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0].address);
          }
        } catch (err) {
          console.error('Initial connection check failed:', err);
        }
      }
    };
    checkConnection();
  }, [isConnected, address]);

  const connectWallet = async () => {
    try {
      await openAppKit();
    } catch (error) {
      console.error("WalletConnect connection failed", error);
    }
  };

  const disconnectWallet = () => {
    if (isConnected) {
      try {
        disconnectAppKit();
      } catch (err) {
        console.error("Failed to disconnect from AppKit", err);
      }
    }
    setAccount(null);
  };

  // Override setIsModalOpen to just trigger AppKit directly for backwards compatibility
  const handleSetIsModalOpen = (open: boolean) => {
    if (open) {
      connectWallet();
    }
  };

  return (
    <WalletContext.Provider value={{ account, connectWallet, disconnectWallet, isModalOpen, setIsModalOpen: handleSetIsModalOpen }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
