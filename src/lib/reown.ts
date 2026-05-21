import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';

// 1. Get projectId (with fallback demo key so it never crashes if empty)
export const projectId = import.meta.env?.VITE_REOWN_PROJECT_ID || 'b56e464c737cbd1817863640b82b9b55';

// 2. Define Monad Mainnet Network
export const monadMainnet = {
  id: 143,
  chainId: 143,
  name: 'Monad Mainnet',
  currency: 'MON',
  explorerUrl: 'https://monadscan.com',
  rpcUrl: 'https://rpc.monad.xyz',
  chainNamespace: 'eip155',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://monadscan.com' },
  }
} as any;

// 3. Create Ethers Adapter
export const ethersAdapter = new EthersAdapter();

// 4. Initialize AppKit
export const appKit = createAppKit({
  adapters: [ethersAdapter],
  networks: [monadMainnet],
  metadata: {
    name: '10K Squad',
    description: 'The elite NFT collective on Monad',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : ''],
  },
  projectId,
});
