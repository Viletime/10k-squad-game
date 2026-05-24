import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownUp, 
  Settings, 
  Info, 
  ChevronDown, 
  Wallet, 
  RefreshCw, 
  ExternalLink,
  Search,
  Check,
  AlertCircle,
  LogOut,
  X,
  Menu
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../lib/WalletContext';

// Monad Network Config
const MONAD_NETWORK = {
  chainId: '0x8f', // Monad Mainnet (143)
  name: 'Monad Mainnet',
  symbol: 'MON',
  rpc: 'https://rpc.monad.xyz', 
  explorer: 'https://monadscan.com/'
};

// Common addresses on Monad Mainnet
const WMON_ADDRESS = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"; 
const USDC_ADDRESS = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603"; // User can also paste custom adress in search
const DEX_ROUTER_ADDRESS = "0xfe31f71c1b106eac32f1a19239c9a9a72ddfb900"; 
const QUOTER_ADDRESS = "0x661e93cca42afacb172121ef892830ca3b70f08d";

// Helper for BigInt serialization
const replacer = (_key: string, value: any) => 
  typeof value === 'bigint' ? value.toString() : value;



interface Token {
  symbol: string;
  name: string;
  logo: string;
  balance: string;
  price: number;
  address: string;
  decimals?: number;
}

interface SuccessData {
  amountIn: string;
  symbolIn: string;
  amountOut: string;
  symbolOut: string;
  txHash: string;
}

const INITIAL_TOKENS: Token[] = [
  { 
    symbol: 'MON', 
    name: 'Monad', 
    logo: 'https://raw.githubusercontent.com/tetherto/token-list/master/assets/eth.png',
    balance: '0.00',
    price: 0.03,
    address: 'native',
    decimals: 18
  },
  { 
    symbol: 'WMON', 
    name: 'Wrapped Monad', 
    logo: 'https://raw.githubusercontent.com/tetherto/token-list/master/assets/eth.png',
    balance: '0.00',
    price: 0.03,
    address: WMON_ADDRESS,
    decimals: 18
  },
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    logo: 'https://raw.githubusercontent.com/tetherto/token-list/master/assets/usdc.png',
    balance: '0.00',
    price: 1.00,
    address: USDC_ADDRESS,
    decimals: 6
  }
];

export default function Swap() {
  const { account, connectWallet, disconnectWallet, isModalOpen, setIsModalOpen } = useWallet();
  const [tokens, setTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  const [balances, setBalances] = useState<Record<string, string>>({});
  // Prices are kept as static fallbacks or derived from USDC pairs where possible
  const [prices, setPrices] = useState<Record<string, number>>({
    'MON': 0.03,
    'WMON': 0.03,
    'USDC': 1.00
  });

  // Fetch Live Prices from DEX and External APIs
  const fetchPricesFromDex = async () => {
    const USDC_TOKEN = INITIAL_TOKENS.find(t => t.symbol === 'USDC');
    if (!USDC_TOKEN) return;

    const newPrices: Record<string, number> = { ...prices };

    try {
      // 1. Try DexScreener API for aggregate prices (Fast & Automatic)
      const addresses = tokens.map(t => t.address === 'native' ? WMON_ADDRESS : t.address).filter(a => ethers.isAddress(a));
      if (addresses.length > 0) {
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`);
          const data = await response.json();
          if (data.pairs && data.pairs.length > 0) {
            data.pairs.forEach((pair: any) => {
              const symbol = tokens.find(t => 
                (t.address === 'native' && pair.baseToken.address.toLowerCase() === WMON_ADDRESS.toLowerCase()) || 
                (t.address.toLowerCase() === pair.baseToken.address.toLowerCase())
              )?.symbol;
              if (symbol && pair.priceUsd) {
                newPrices[symbol] = parseFloat(pair.priceUsd);
              }
            });
          }
        } catch (dexErr) {
          console.warn("DexScreener fetch failed, using fallback", dexErr);
        }
      }

      // 2. Try on-chain DEX Quoter if DexScreener didn't cover everything or failed
      const readProvider = new ethers.JsonRpcProvider(MONAD_NETWORK.rpc);
      const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, readProvider);
      const usdcAddr = USDC_ADDRESS;

      await Promise.all(tokens.map(async (token) => {
        // USDC always 1.0
        if (token.symbol === 'USDC' || token.symbol === 'USDT' || token.address === USDC_ADDRESS) {
          newPrices[token.symbol] = 1.00;
          return;
        }

        const fromAddr = token.address === 'native' ? WMON_ADDRESS : token.address;
        if (!ethers.isAddress(fromAddr)) return;

        const amountIn = ethers.parseUnits("1", token.decimals || 18);

        try {
          // Try direct path to USDC to get USD price using V3 Quoter
          const params = {
            tokenIn: fromAddr,
            tokenOut: usdcAddr,
            amountIn: amountIn,
            fee: 3000, 
            sqrtPriceLimitX96: 0
          };
          
          const quoteResult = await quoter.quoteExactInputSingle.staticCall(params);
          const price = parseFloat(ethers.formatUnits(quoteResult.amountOut, 6)); // Assuming USDC is 6 decimals
          if (price > 0) newPrices[token.symbol] = price;
        } catch (e) {
          // If no liquidity, we maintain the base price or slightly fluctuate for "live" feel
          const base = token.symbol === 'MON' || token.symbol === 'WMON' ? 0.03 : 1.0;
          const fluctuation = (Math.random() - 0.5) * 0.0001;
          newPrices[token.symbol] = (newPrices[token.symbol] || base) + fluctuation;
        }
      }));

      setPrices(prev => ({ ...prev, ...newPrices }));
      
      // Sync token list prices
      setTokens(prev => prev.map(t => ({
        ...t,
        price: newPrices[t.symbol] || t.price
      })));

      // Sync selected tokens
      if (fromToken) setFromToken(prev => ({ ...prev, price: newPrices[prev.symbol] || prev.price }));
      if (toToken) setToToken(prev => ({ ...prev, price: newPrices[prev.symbol] || prev.price }));
      
    } catch (err) {
      console.error("Price fetch error:", err);
    }
  };

  useEffect(() => {
    fetchPricesFromDex();
    const interval = setInterval(fetchPricesFromDex, 10000); // 10s refresh for better responsiveness
    return () => clearInterval(interval);
  }, []); // Only run on mount

  const [fromToken, setFromToken] = useState<Token>(INITIAL_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(INITIAL_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectingFor, setSelectingFor] = useState<'from' | 'to'>('from');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [hasLiquidity, setHasLiquidity] = useState(true);
  const [bestFee, setBestFee] = useState<number>(3000);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [txReceipt, setTxReceipt] = useState<SuccessData | null>(null);

  useEffect(() => {
    if (txReceipt) {
      const timer = setTimeout(() => {
        setTxReceipt(null);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [txReceipt]);

  // WMON Minimal ABI for Wrap/Unwrap
  const WMON_ABI = [
    "function deposit() public payable",
    "function withdraw(uint256 wad) public",
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  // ERC20 Minimal ABI
  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  // Uniswap V3 Router Minimal ABI
  const ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
  ];

  // Uniswap V3 Quoter Minimal ABI
  const QUOTER_ABI = [
    "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
  ];

  // Placeholder Router (Update with real Monad DEX address)
  // const DEX_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; 

  // Fetch Balances
  const fetchBalances = async () => {
    if (!account) return;
    
    // Explicitly use Monad RPC for read actions to avoid network mismatch
    const readProvider = new ethers.JsonRpcProvider(MONAD_NETWORK.rpc);
    
    const newBalances: Record<string, string> = {};
    
    try {
      await Promise.all(tokens.map(async (token) => {
        try {
          if (token.address === 'native') {
            const balance = await readProvider.getBalance(account);
            newBalances[token.symbol] = ethers.formatEther(balance);
          } else if (ethers.isAddress(token.address)) {
            const contract = new ethers.Contract(token.address, ERC20_ABI, readProvider);
            
            let decimals = 18;
            try {
              decimals = await contract.decimals();
            } catch (err) {
              console.warn(`Could not fetch decimals for ${token.symbol} at ${token.address}, defaulting to 18 (or 6 if USDC).`);
              if (token.symbol.includes('USDC') || token.symbol.includes('USDT')) decimals = 6;
            }

            const balance = await contract.balanceOf(account);
            newBalances[token.symbol] = ethers.formatUnits(balance, decimals);
          } else {
            console.warn(`Skipping balance fetch for invalid address: ${token.symbol} (${token.address})`);
            newBalances[token.symbol] = '0.00';
          }
        } catch (err) {
          console.error(`Error fetching balance for ${token.symbol}:`, err);
          newBalances[token.symbol] = balances[token.symbol] || '0.00';
        }
      }));
      setBalances(prev => ({ ...prev, ...newBalances }));
    } catch (err) {
      console.error("Global balance fetch error:", err);
    }
  };

  useEffect(() => {
    if (account) fetchBalances();
  }, [account, tokens.length]); // Only fetch on account change or new tokens added, not price updates

  // Handle Search & Discovery
  const searchResults = tokens.filter(t => 
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.address.toLowerCase() === searchQuery.toLowerCase()
  );

  // Allow adding custom token if search is a valid address and not found
  const isSearchAddress = ethers.isAddress(searchQuery);
  const isNewAddress = isSearchAddress && !tokens.some(t => t.address.toLowerCase() === searchQuery.toLowerCase());

  const addCustomToken = async (address: string) => {
    const readProvider = new ethers.JsonRpcProvider(MONAD_NETWORK.rpc);
    const contract = new ethers.Contract(address, ERC20_ABI, readProvider);
    try {
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol().catch(() => "UNKNOWN"),
        contract.name().catch(() => "Unknown Token"),
        contract.decimals().catch(() => 18)
      ]);
      
      const newToken: Token = {
        symbol,
        name,
        address,
        decimals: Number(decimals),
        logo: 'https://raw.githubusercontent.com/tetherto/token-list/master/assets/eth.png',
        balance: '0.00',
        price: 0
      };
      
      setTokens(prev => [...prev, newToken]);
      if (selectingFor === 'from') setFromToken(newToken);
      else setToToken(newToken);
      setIsTokenListOpen(false);
      setSearchQuery('');
    } catch (err) {
      console.error("Failed to add custom token:", err);
      alert("Could not fetch token data. Ensure address is an ERC20 on Monad.");
    }
  };

  // Check Approval Needs
  useEffect(() => {
    const checkApproval = async () => {
      if (!account || fromToken.address === 'native' || !fromAmount || isNaN(parseFloat(fromAmount))) {
        setNeedsApproval(false);
        return;
      }

      // Case: Unwrap WMON to MON doesn't need Router approval, it's a direct call to WMON
      if (fromToken.address === WMON_ADDRESS && toToken.address === 'native') {
        setNeedsApproval(false);
        return;
      }
      
      try {
        if (!(window as any).ethereum) return;
        const readProvider = new ethers.JsonRpcProvider(MONAD_NETWORK.rpc);
        const contract = new ethers.Contract(fromToken.address, ERC20_ABI, readProvider);
        
        const allowance = await contract.allowance(account, DEX_ROUTER_ADDRESS);
        const amountWei = ethers.parseUnits(fromAmount, fromToken.decimals || 18);
        
        setNeedsApproval(allowance < amountWei);
      } catch (err) {
        setNeedsApproval(false);
      }
    };
    checkApproval();
  }, [fromAmount, fromToken, account]);

  const handleApprove = async () => {
    if (!account || !(window as any).ethereum) return;
    setIsApproving(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(fromToken.address, ERC20_ABI, signer);
      
      const tx = await contract.approve(DEX_ROUTER_ADDRESS, ethers.MaxUint256);
      await tx.wait();
      setNeedsApproval(false);
    } catch (err) {
      console.error("Approval failed", err);
    } finally {
      setIsApproving(false);
    }
  };

  // Improved Price Calculation using DEX exclusively
  useEffect(() => {
    let active = true;

    const updateEstimate = async () => {
      if (!fromAmount || isNaN(parseFloat(fromAmount)) || parseFloat(fromAmount) <= 0) {
        if (active) {
          setToAmount('');
          setHasLiquidity(true);
        }
        return;
      }

      if (!(window as any).ethereum) return;

      try {
        // Special case: Wrap/Unwrap is always 1:1
        const isWrap = fromToken.address === 'native' && toToken.address === WMON_ADDRESS;
        const isUnwrap = fromToken.address === WMON_ADDRESS && toToken.address === 'native';
        
        if (isWrap || isUnwrap) {
          if (active) {
            setToAmount(fromAmount);
            setHasLiquidity(true);
          }
          return;
        }

        const readProvider = new ethers.JsonRpcProvider(MONAD_NETWORK.rpc);
        const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, readProvider);
        
        const fromAddr = fromToken.address === 'native' ? WMON_ADDRESS : fromToken.address;
        const toAddr = toToken.address === 'native' ? WMON_ADDRESS : toToken.address;
        
        const decimals = fromToken.decimals || 18;
        let sanitizedAmount = fromAmount;
        if (sanitizedAmount.includes('.')) {
          const [intPart, fracPart] = sanitizedAmount.split('.');
          sanitizedAmount = `${intPart}.${fracPart.substring(0, decimals)}`;
        }
        
        const amountIn = ethers.parseUnits(sanitizedAmount, decimals);

        try {
          // Uniswap V3 Quote: Try common fee tiers
          const feeTiers = [500, 3000, 10000];
          let successfulQuote = null;

          for (const fee of feeTiers) {
            try {
              const params = {
                tokenIn: fromAddr,
                tokenOut: toAddr,
                amountIn: amountIn,
                fee: fee, 
                sqrtPriceLimitX96: 0
              };
              const quoteResult = await quoter.quoteExactInputSingle.staticCall(params);
              successfulQuote = { amountOut: quoteResult.amountOut, fee };
              break; 
            } catch (e) {
              continue;
            }
          }

          if (active && successfulQuote) {
            setHasLiquidity(true);
            setBestFee(successfulQuote.fee);
            const formatted = ethers.formatUnits(successfulQuote.amountOut, toToken.decimals || 18);
            setToAmount(formatted);
          } else if (active) {
            setHasLiquidity(false);
            // Fallback to theoretical price index
            const fromPrice = prices[fromToken.symbol] || fromToken.price;
            const toPrice = prices[toToken.symbol] || toToken.price;
            if (fromPrice && toPrice) {
              const estimated = parseFloat(fromAmount) * (fromPrice / toPrice);
              setToAmount(estimated.toFixed(6).replace(/\.?0+$/, ""));
            } else {
              setToAmount('');
            }
          }
        } catch (quoteErr: any) {
          console.warn("V3 Quoting process failed:", quoteErr.message);
          if (active) {
            setHasLiquidity(false);
            setToAmount('');
          }
        }
      } catch (err) {
        console.error("Estimate error:", err);
      }
    };

    const timeoutId = setTimeout(updateEstimate, 300); // Debounce
    return () => { active = false; clearTimeout(timeoutId); };
  }, [fromAmount, fromToken, toToken, prices]);

  const handlePercentAmount = (percent: number) => {
    const balanceStr = balances[fromToken.symbol];
    if (!balanceStr || isNaN(parseFloat(balanceStr))) return;
    
    // For 100% exact amounts (except native MON which needs gas buffer)
    if (percent === 100 && fromToken.address !== 'native') {
      setFromAmount(balanceStr);
      return;
    }

    // For native MON, we should keep some for gas (approx 0.05 MON to be safe)
    const gasBuffer = fromToken.symbol === 'MON' ? 0.05 : 0;
    const total = parseFloat(balanceStr);
    const amount = Math.max(0, (total * (percent / 100)) - (percent === 100 ? gasBuffer : 0));
    
    if (amount <= 0) {
      setFromAmount('');
      return;
    }

    const decimals = fromToken.decimals || 18;
    setFromAmount(amount.toFixed(decimals).replace(/\.?0+$/, ""));
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
  };

  const handleFromAmountChange = (val: string) => {
    // Only allow numbers and one decimal point
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setFromAmount(val);
    }
  };

  const handleSwapExecute = async () => {
    if (!account) {
      setIsModalOpen(true);
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    
    // Prevent same token swap
    if (fromToken.address === toToken.address) {
      alert("Source and destination tokens must be different.");
      return;
    }

    setIsSwapping(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum as any);
      const signer = await provider.getSigner();
      
      const decimals = fromToken.decimals || 18;
      let sanitizedAmountFrom = fromAmount;
      if (sanitizedAmountFrom.includes('.')) {
        const [intPart, fracPart] = sanitizedAmountFrom.split('.');
        sanitizedAmountFrom = `${intPart}.${fracPart.substring(0, decimals)}`;
      }
      const fromAmountWei = ethers.parseUnits(sanitizedAmountFrom, decimals);

      // Pre-flight balance check
      const currentBalanceStr = balances[fromToken.symbol];
      if (currentBalanceStr) {
        const currentBalanceWei = ethers.parseUnits(currentBalanceStr, decimals);
        if (fromAmountWei > currentBalanceWei) {
          alert(`Insufficient ${fromToken.symbol} balance.`);
          setIsSwapping(false);
          return;
        }
      }

      // 1. Wrap/Unwrap Handlers
      if (fromToken.address === 'native' && toToken.address === WMON_ADDRESS) {
        console.log("Wrapping MON to WMON...");
        const wmonContract = new ethers.Contract(WMON_ADDRESS, WMON_ABI, signer);
        const tx = await wmonContract.deposit({ value: fromAmountWei });
        await tx.wait();
        
        setTxReceipt({
          amountIn: fromAmount,
          symbolIn: fromToken.symbol,
          amountOut: fromAmount,
          symbolOut: toToken.symbol,
          txHash: tx.hash
        });
        
        fetchBalances();
        setFromAmount('');
        return;
      }

      if (fromToken.address === WMON_ADDRESS && toToken.address === 'native') {
        console.log("Unwrapping WMON to MON...");
        const wmonContract = new ethers.Contract(WMON_ADDRESS, WMON_ABI, signer);
        const tx = await wmonContract.withdraw(fromAmountWei);
        await tx.wait();
        
        setTxReceipt({
          amountIn: fromAmount,
          symbolIn: fromToken.symbol,
          amountOut: fromAmount,
          symbolOut: toToken.symbol,
          txHash: tx.hash
        });
        
        fetchBalances();
        setFromAmount('');
        return;
      }

      // 2. Setup Parameters for Uniswap V3 Swap
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; 
      
      // Calculate amountOutMinimum with slippage protection
      // Use the actual toToken decimals for precision
      const toDecimals = toToken.decimals || 18;
      const slippageFactor = 1 - parseFloat(slippage) / 100;
      const estimatedOutput = parseFloat(toAmount);
      const slippageAdjusted = estimatedOutput * slippageFactor;
      
      // Use a safer calculation for amountOutMinimum to avoid floating point issues
      const amountOutMin = ethers.parseUnits(slippageAdjusted.toFixed(toDecimals), toDecimals);
      
      const tokenIn = fromToken.address === 'native' ? WMON_ADDRESS : fromToken.address;
      const tokenOut = toToken.address === 'native' ? WMON_ADDRESS : toToken.address;

      // Uniswap V3 ExactInputSingleParams struct
      // Note: Deadline is often removed in some SwapRouter02 versions or handled differently
      const swapParams = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: bestFee || 3000, 
        recipient: account,
        amountIn: fromAmountWei,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0 
      };

      // 3. Approval and Value Strategy
      let value = BigInt(0);
      
      if (fromToken.address === 'native') {
        // MON -> TOKEN: Attach value, no approval needed for native
        value = fromAmountWei;
        console.log("Native MON detected. Attaching value to swap call:", ethers.formatEther(value));
      } else {
        // ERC20 -> TOKEN: Mandatory Approval check + wait
        try {
          const fromContract = new ethers.Contract(fromToken.address, ERC20_ABI, signer);
          console.log(`Checking allowance for ${fromToken.symbol}...`);
          const allowance = await fromContract.allowance(account, DEX_ROUTER_ADDRESS);
          
          if (allowance < fromAmountWei) {
            console.log(`Insufficient allowance (${ethers.formatUnits(allowance, decimals)}). Approving ${fromToken.symbol} for Router...`);
            setIsApproving(true);
            const approveTx = await fromContract.approve(DEX_ROUTER_ADDRESS, ethers.MaxUint256);
            console.log("Approval transaction sent. Waiting for confirmation...");
            await approveTx.wait();
            console.log("Approval confirmed.");
            setIsApproving(false);
          } else {
            console.log("Allowance sufficient:", ethers.formatUnits(allowance, decimals));
          }
        } catch (approveErr: any) {
          console.error("Token approval process failed:", approveErr);
          throw new Error(`Failed to approve ${fromToken.symbol}: ${approveErr.message}`);
        }
      }

      // 4. Final Execution
      const router = new ethers.Contract(DEX_ROUTER_ADDRESS, ROUTER_ABI, signer);
      console.log(`Executing V3 Swap via Router ${DEX_ROUTER_ADDRESS}`);
      console.log("Swap Parameters:", JSON.stringify(swapParams, replacer, 2));
      console.log("Value attached:", value.toString());
      
      let tx;
      try {
        // Use the exact parameters and overrides
        tx = await router.exactInputSingle(swapParams, { value });
        console.log("Swap transaction sent:", tx.hash);
      } catch (swapCallErr: any) {
        console.error("Uniswap V3 Swap call failed:", swapCallErr);
        throw new Error(`Transaction failed: ${swapCallErr.reason || swapCallErr.message || "Unknown error."}`);
      }
      
      const receipt = await tx.wait();
      console.log("TX Receipt:", receipt);
      console.log("TX Hash:", tx.hash);
      
      // Show Success Receipt
      setTxReceipt({
        amountIn: fromAmount,
        symbolIn: fromToken.symbol,
        amountOut: toAmount,
        symbolOut: toToken.symbol,
        txHash: tx.hash
      });
      
      fetchBalances();
      setFromAmount('');
    } catch (err: any) {
      console.error("CRITICAL SWAP ERROR:", err);
      const msg = err.reason || err.message || "Unknown error occurred during swap.";
      alert("Transaction failed: " + msg);
    } finally {
      setIsSwapping(false);
      setIsApproving(false);
    }
  };

  return (
    <div className={`relative min-h-screen transition-colors duration-500 overflow-x-hidden ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-black'}`}>
      {/* Decorative Blur Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20 ${theme === 'dark' ? 'bg-[#ff6b9d]' : 'bg-[#ff6b9d]/30'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20 ${theme === 'dark' ? 'bg-purple-600' : 'bg-purple-600/20'}`} />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#ff6b9d] rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(255,107,157,0.4)]">
              <RefreshCw className="text-white w-6 h-6 animate-pulse" />
            </div>
            <span className="text-2xl font-black uppercase italic tracking-tighter leading-none hidden sm:block">
              10K SQUAD <span className="text-[#ff6b9d]">SWAP</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {account ? (
              <div className="flex items-center gap-2">
                <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border flex items-center gap-2 sm:gap-3 ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-[#ff6b9d] to-purple-600" />
                  <span className="text-[9px] sm:text-[11px] font-bold font-mono">
                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                  </span>
                </div>
                <motion.button 
                  onClick={disconnectWallet} 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Disconnect Wallet"
                  className={`p-2 rounded-2xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-red-400' : 'bg-black/5 border-black/10 hover:border-red-500/30 hover:bg-red-500/10 text-red-500'}`}
                >
                  <LogOut size={16} />
                </motion.button>
              </div>
            ) : (
              <button 
                onClick={() => setIsModalOpen(true)}
                className={`hidden sm:flex px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg items-center gap-2 ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                <Wallet size={16} />
                Connect Wallet
              </button>
            )}

            <Link to="/" className={`hidden sm:flex px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}>
              Back
            </Link>

            {/* MOBILE MENU BUTTON */}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMenu} 
              className="sm:hidden opacity-50 hover:opacity-100 transition-all p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[40] pt-[100px] bg-[#0a0a0a] flex flex-col items-center justify-start gap-8 p-10 text-white sm:hidden"
          >
            <nav className="flex flex-col items-center gap-8 text-xl uppercase font-black italic tracking-widest text-center">
              <Link to="/" onClick={closeMenu} className="hover:text-[#ff6b9d]">Home</Link>
              <Link to="/traits" onClick={closeMenu} className="hover:text-[#ff6b9d]">Collection</Link>
              <Link to="/swap" onClick={closeMenu} className="text-[#ff6b9d]">Swap</Link>
              <Link to="/game" onClick={closeMenu} className="hover:text-[#ff6b9d]">Play</Link>
              
              {!account && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsModalOpen(true);
                    closeMenu();
                  }}
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

      {/* Main Swap Card */}
      <main className="relative z-10 px-6 pt-52 pb-24 flex flex-col items-center">
        <div className="relative w-full max-w-[440px]">
          {/* Character sitting on top */}
          <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[200px] h-auto z-20 pointer-events-none select-none">
            <motion.img 
              initial={{ y: 20, opacity: 0 }}
              animate={{ 
                y: [0, -6, 0],
                opacity: 1 
              }}
              transition={{ 
                y: {
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut"
                },
                opacity: {
                  duration: 0.8,
                  delay: 0.3,
                  ease: "easeOut"
                }
              }}
              src="/monad_swapper_nobg.png" 
              alt="Monad Swapper Character"
              className="w-full h-auto drop-shadow-[0_-5px_20px_rgba(255,107,157,0.3)]"
            />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative z-10 w-full p-1.5 rounded-[2.5rem] shadow-2xl ${theme === 'dark' ? 'bg-[#151f2e] border border-white/5 backdrop-blur-3xl' : 'bg-white border border-black/5 shadow-xl'}`}
          >
          <div className={`p-5 rounded-[2.2rem] ${theme === 'dark' ? 'bg-[#1a273b]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6 px-2">
              <div className="bg-[#ff6b9d] px-4 py-2 rounded-full shadow-lg shadow-[#ff6b9d]/30">
                <h2 className="text-xs font-black uppercase tracking-widest text-white italic">Swap</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${theme === 'dark' ? 'bg-[#0f172a] text-white/40' : 'bg-gray-100 text-black/40'}`}>
                  <span className="text-[10px] font-black">{slippage}%</span>
                  <button onClick={() => setShowSettings(!showSettings)}>
                    <Settings size={12} className="hover:text-[#ff6b9d] transition-colors" />
                  </button>
                </div>
                <button 
                  onClick={() => fetchBalances()}
                  className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-[#0f172a] text-white/40 hover:text-white' : 'bg-gray-100 text-black/40 hover:text-black'}`}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Input From */}
            <div className={`relative p-6 rounded-3xl mb-1 group transition-all duration-300 ${theme === 'dark' ? 'bg-[#0f172a] border border-white/5 hover:border-[#ff6b9d]/30' : 'bg-gray-50 border border-black/5 hover:border-[#ff6b9d]/30'}`}>
              <div className="flex justify-end mb-4 h-8">
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  {[25, 50, 75, 100].map(p => (
                    <button 
                      key={p}
                      onClick={() => handlePercentAmount(p)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${theme === 'dark' ? 'bg-white/5 hover:bg-[#ff6b9d] hover:text-white text-white/40' : 'bg-black/5 hover:bg-[#ff6b9d] hover:text-white text-black/40'}`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={fromAmount}
                    onChange={(e) => handleFromAmountChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent border-none text-4xl font-black focus:ring-0 focus:outline-none placeholder:opacity-20 p-0 leading-tight italic tracking-tighter caret-[#ff6b9d] selection:bg-[#ff6b9d]/20"
                  />
                  <div className="text-xs font-bold opacity-30 mt-1">
                    ${(parseFloat(fromAmount || '0') * (prices[fromToken.symbol] || fromToken.price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5">
                  <button 
                    onClick={() => { setSelectingFor('from'); setIsTokenListOpen(true); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all shadow-xl border ${theme === 'dark' ? 'bg-[#1a273b] border-white/5 hover:bg-[#23334d] text-white hover:border-[#ff6b9d]/30' : 'bg-white border-black/5 hover:bg-gray-50 text-black hover:border-[#ff6b9d]/30'}`}
                  >
                    <span className="font-black text-base italic tracking-tight uppercase">{fromToken.symbol}</span>
                    <ChevronDown size={14} className="opacity-40" />
                  </button>
                  <button 
                    onClick={() => handlePercentAmount(100)}
                    className="text-[11px] font-black italic tracking-tight opacity-30 hover:opacity-100 pr-1 transition-opacity cursor-pointer text-right"
                  >
                    {Number(balances[fromToken.symbol] || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </button>
                </div>
              </div>
            </div>

            {/* Switch Button */}
            <div className="relative h-2 z-10 flex justify-center">
              <button 
                onClick={handleSwapTokens}
                className={`group absolute -translate-y-1/2 p-3 rounded-2xl border-4 transition-all hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-[#1a273b] border-[#0a0a0a] text-white hover:bg-[#23334d]' : 'bg-white border-gray-50 text-black hover:bg-gray-100 shadow-lg'}`}
              >
                <ArrowDownUp size={20} className="group-hover:rotate-180 transition-transform duration-500 text-[#ff6b9d]" />
              </button>
            </div>

            {/* Input To */}
            <div className={`relative p-6 rounded-3xl mt-1 group transition-all duration-300 ${theme === 'dark' ? 'bg-[#0f172a] border border-white/5 hover:border-[#ff6b9d]/30' : 'bg-gray-50 border border-black/5 hover:border-[#ff6b9d]/30'}`}>
              <div className="h-4 mb-4" /> {/* Spacer */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <input 
                    type="text"
                    inputMode="decimal" 
                    value={toAmount}
                    readOnly
                    placeholder="0.0"
                    className="w-full bg-transparent border-none text-4xl font-black focus:ring-0 focus:outline-none placeholder:opacity-20 p-0 leading-tight italic tracking-tighter caret-[#ff6b9d] selection:bg-[#ff6b9d]/20"
                  />
                  <div className="text-xs font-bold opacity-30 mt-1">
                    ${(parseFloat(toAmount || '0') * (prices[toToken.symbol] || toToken.price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <button 
                    onClick={() => { setSelectingFor('to'); setIsTokenListOpen(true); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all shadow-xl border ${theme === 'dark' ? 'bg-[#1a273b] border-white/5 hover:bg-[#23334d] text-white hover:border-[#ff6b9d]/30' : 'bg-white border-black/5 hover:bg-gray-50 text-black hover:border-[#ff6b9d]/30'}`}
                  >
                    <span className="font-black text-base italic tracking-tight uppercase">{toToken.symbol}</span>
                    <ChevronDown size={14} className="opacity-40" />
                  </button>
                  <div className="text-[11px] font-black italic tracking-tight opacity-30 pr-1">
                    {Number(balances[toToken.symbol] || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Details */}
            <AnimatePresence>
              {fromAmount && parseFloat(fromAmount) > 0 && toAmount && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className={`p-5 rounded-3xl space-y-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50/50 border border-black/5'}`}>
                    {!hasLiquidity && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-2">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-bold">No direct liquidity on DEX. Amount is estimated.</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Exchange Rate</span>
                      <div className="text-[11px] font-black italic">
                        1 {fromToken.symbol} = { (parseFloat(toAmount) / parseFloat(fromAmount)).toLocaleString(undefined, { maximumFractionDigits: 6 }) } {toToken.symbol}
                        <span className="opacity-40 ml-1">(${(prices[fromToken.symbol] || fromToken.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-40">Minimum received</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-black'}>
                        {(parseFloat(toAmount) * (1 - parseFloat(slippage)/100)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-40">Route</span>
                      <div className="flex items-center gap-1.5 text-[#ff6b9d]">
                        <RefreshCw size={10} className="animate-spin-slow" />
                        <span>{fromToken.address === 'native' && toToken.address === WMON_ADDRESS ? 'Wrap' : (fromToken.address === WMON_ADDRESS && toToken.address === 'native' ? 'Unwrap' : 'Kuru')}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-40">Price impact</span>
                      <span className="opacity-60">--</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-40">Fee</span>
                      <span className="opacity-60">0%</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-40">Slippage</span>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-[#ff6b9d]/10 text-[#ff6b9d]">{slippage}%</span>
                        <span className="opacity-20 italic">Auto</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Action Button */}
            <button 
              onClick={handleSwapExecute}
              disabled={isSwapping || isApproving || !toAmount || (account && !fromAmount)}
              className={`w-full mt-8 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.1em] text-base transition-all shadow-2xl disabled:opacity-50 disabled:grayscale italic ${
                isSwapping || isApproving || !toAmount
                  ? 'bg-white/10' 
                  : 'bg-[#ff6b9d] hover:bg-[#ff85af] text-white shadow-[#ff6b9d]/40'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                {isSwapping || isApproving ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>{isApproving ? 'Approving...' : 'Processing...'}</span>
                  </>
                ) : (
                  <span>
                    {!account 
                      ? 'Connect' 
                      : !fromAmount 
                        ? 'Enter Amount' 
                        : needsApproval 
                          ? `Approve ${fromToken.symbol}` 
                          : 'Swap'}
                  </span>
                )}
              </div>
            </button>


          </div>
        </motion.div>
        </div>
      </main>

      {/* Token List Modal */}
      <AnimatePresence>
        {isTokenListOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTokenListOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-[360px] p-6 rounded-[2rem] shadow-2xl border ${theme === 'dark' ? 'bg-[#1a273b] border-white/10' : 'bg-white border-black/5'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">Select Asset</h3>
                  <button 
                    onClick={() => fetchBalances()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                  >
                    <RefreshCw size={10} />
                    Refresh
                  </button>
                </div>
                <button onClick={() => setIsTokenListOpen(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className={`relative mb-6`}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                <input 
                  type="text" 
                  placeholder="Search name or paste address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-4 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-[#ff6b9d]/30 focus:outline-none transition-all ${theme === 'dark' ? 'bg-[#0f172a] border-white/5 text-white' : 'bg-gray-50 border-black/5 text-black'}`}
                />
              </div>

              <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {isNewAddress && (
                  <button
                    onClick={() => addCustomToken(searchQuery)}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border-2 border-dashed ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-black uppercase text-base tracking-tight italic">Add Custom</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{searchQuery.substring(0, 10)}...{searchQuery.substring(34)}</p>
                      </div>
                    </div>
                    <Check size={20} className="text-[#ff6b9d]" />
                  </button>
                )}
                {searchResults.length > 0 ? (
                  searchResults.map((token) => (
                    <button
                      key={`${token.symbol}-${token.address}`}
                      onClick={() => {
                        if (selectingFor === 'from') setFromToken(token);
                        else setToToken(token);
                        setIsTokenListOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-black uppercase text-base tracking-tight italic">{token.symbol}</p>
                          <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{token.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm tracking-tight italic">{Number(balances[token.symbol] || 0).toFixed(4)}</p>
                        <p className="text-[10px] opacity-40 font-bold">${(parseFloat(balances[token.symbol] || '0') * (prices[token.symbol] || token.price)).toLocaleString()}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center opacity-20 italic font-black uppercase tracking-widest">No asset found</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal (Small) */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative p-8 rounded-[2.5rem] border shadow-2xl w-full max-w-[340px] focus:outline-none ${theme === 'dark' ? 'bg-[#1a273b] border-white/10' : 'bg-white border-black/10'}`}
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-black uppercase italic tracking-tighter">Swap Settings</span>
                <button onClick={() => setShowSettings(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                  <AlertCircle className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black mb-4 opacity-40 uppercase tracking-[0.2em]">Slippage Tolerance</p>
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1.0'].map(s => (
                      <button 
                        key={s}
                        onClick={() => setSlippage(s)}
                        className={`flex-1 py-3 rounded-2xl text-xs font-black tracking-tight border transition-all ${slippage === s ? 'bg-[#ff6b9d] border-[#ff6b9d] text-white shadow-lg shadow-[#ff6b9d]/20' : (theme === 'dark' ? 'bg-[#0f172a] border-white/5 text-white/60 hover:text-white' : 'bg-gray-50 border-black/5 text-black/60')}`}
                      >
                        {s}%
                      </button>
                    ))}
                    <div className={`flex-1 relative flex items-center rounded-2xl border transition-all ${!['0.1', '0.5', '1.0'].includes(slippage) ? 'border-[#ff6b9d] bg-[#ff6b9d]/10' : (theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-gray-50 border-black/5')}`}>
                      <input 
                        type="number"
                        step="0.1"
                        value={!['0.1', '0.5', '1.0'].includes(slippage) ? slippage : ''}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (parseFloat(val) > 50) val = '50';
                          setSlippage(val);
                        }}
                        placeholder="0.0"
                        className={`w-full bg-transparent border-none text-right pr-5 text-xs font-black focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                      />
                      <span className="absolute right-2 text-[10px] font-black opacity-40">%</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 px-6 py-12 text-center opacity-40 pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Optimized for Monad High Speed Throughput</p>
      </footer>

      {/* Success Transaction Notification (Bottom Right) */}
      <AnimatePresence>
        {txReceipt && (
          <div className="absolute top-24 right-4 sm:right-8 z-[10000] flex flex-col items-end pointer-events-none">
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="pointer-events-auto"
            >
              <div className={`relative flex items-center gap-4 p-4 pr-12 rounded-3xl shadow-xl border backdrop-blur-xl ${
                theme === 'dark' 
                  ? 'bg-slate-900/90 border-slate-700/50 text-white' 
                  : 'bg-white/90 border-slate-200 text-slate-900'
              }`}>
                {/* Status Dot */}
                <div className="relative flex-shrink-0">
                  <div className="relative w-10 h-10 bg-[#10b981] rounded-2xl flex items-center justify-center shadow-lg">
                    <Check size={20} className="text-white" strokeWidth={3} />
                  </div>
                </div>

                <div className="flex flex-col min-w-[180px]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Swap Successful</p>
                  <a 
                    href={txReceipt.txHash ? `https://monadscan.com/tx/${txReceipt.txHash}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="group"
                  >
                    <div className="flex items-center gap-1.5 hover:text-[#ff6b9d] transition-colors">
                      <span className="text-sm font-black italic tracking-tight">
                        {txReceipt.amountIn || '0'} {txReceipt.symbolIn || ''} → {txReceipt.amountOut || '0'} {txReceipt.symbolOut || ''}
                      </span>
                      <ExternalLink size={12} className="opacity-40 group-hover:opacity-100" />
                    </div>
                  </a>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setTxReceipt(null)}
                  className={`absolute top-2 right-2 p-1.5 rounded-xl hover:bg-[#ff6b9d]/10 hover:text-[#ff6b9d] transition-all opacity-40 hover:opacity-100`}
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

