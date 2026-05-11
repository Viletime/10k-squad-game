import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun as SunIcon, Moon as MoonIcon, Menu, X, Search, Filter, ArrowUpDown, ExternalLink, ChevronDown, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FloatingParticles } from '../App';

type Tier = 'Legendary' | 'Rare' | 'Uncommon' | 'Common';

interface Trait {
  id: string;
  name: string;
  category: string;
  tier: Tier;
  image: string;
  holders: number;
  rarity: string;
  opensea_url?: string;
}

const TIER_COLORS: Record<Tier, string> = {
  Legendary: '#FFD700',
  Rare: '#9B59B6',
  Uncommon: '#3498DB',
  Common: '#95A5A6',
};

const getTier = (rarityPercent: number): Tier => {
  if (rarityPercent <= 1) return 'Legendary';
  if (rarityPercent <= 3) return 'Rare';
  if (rarityPercent <= 15) return 'Uncommon';
  return 'Common';
};

// Mock data generator for traits
const MOCK_TRAITS: Trait[] = [
  // Legendary
  { id: 'l1', name: 'Golden Panda', category: 'Character', tier: 'Legendary', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80', holders: 4, rarity: '0.12%' },
  { id: 'l2', name: 'Solar Flare', category: 'Background', tier: 'Legendary', image: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400&q=80', holders: 8, rarity: '0.24%' },
  { id: 'l3', name: 'Cyber Eyes', category: 'Eyes', tier: 'Legendary', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80', holders: 12, rarity: '0.36%' },
  { id: 'l4', name: 'Crown of Monad', category: 'Hats', tier: 'Legendary', image: 'https://images.unsplash.com/photo-1590005354167-6da97870c757?w=400&q=80', holders: 2, rarity: '0.06%' },
  // Rare
  { id: 'r1', name: 'Purple Spirit', category: 'Character', tier: 'Rare', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80', holders: 45, rarity: '1.35%' },
  { id: 'r2', name: 'Neon City', category: 'Background', tier: 'Rare', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80', holders: 32, rarity: '0.96%' },
  { id: 'r3', name: 'Visor', category: 'Eyes', tier: 'Rare', image: 'https://images.unsplash.com/photo-1478479405421-ce83c92fb3ba?w=400&q=80', holders: 50, rarity: '1.5%' },
  { id: 'r4', name: 'Diamond Grillz', category: 'Mouth', tier: 'Rare', image: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=400&q=80', holders: 28, rarity: '0.84%' },
  { id: 'r5', name: 'Katana', category: 'Hand', tier: 'Rare', image: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=400&q=80', holders: 60, rarity: '1.8%' },
  // Uncommon
  { id: 'u1', name: 'Street Hoodie', category: 'Clothing', tier: 'Uncommon', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80', holders: 120, rarity: '3.6%' },
  { id: 'u2', name: 'Sunglasses', category: 'Eyes', tier: 'Uncommon', image: 'https://images.unsplash.com/photo-1511499767390-90342f567210?w=400&q=80', holders: 150, rarity: '4.5%' },
  { id: 'u3', name: 'Cap', category: 'Hats', tier: 'Uncommon', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80', holders: 180, rarity: '5.4%' },
  { id: 'u4', name: 'Bubble Gum', category: 'Mouth', tier: 'Uncommon', image: 'https://images.unsplash.com/photo-1527735095040-147d997cfcc3?w=400&q=80', holders: 200, rarity: '6.0%' },
  { id: 'u5', name: 'Pink Sky', category: 'Background', tier: 'Uncommon', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80', holders: 250, rarity: '7.5%' },
];

export default function Traits() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier | 'All'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'rarity' | 'holders'>('name');
  
  const [traits, setTraits] = useState<Trait[]>([]);
  const [fullNFTs, setFullNFTs] = useState<any[]>([]);
  const [collectionStats, setCollectionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  // Arcade Collection States
  const [activeTab, setActiveTab] = useState<'nfts' | 'traits'>('nfts');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  
  // Sync States
  const [syncProgress, setSyncProgress] = useState<{ current: number, total: number, active: boolean }>({ current: 0, total: 3333, active: false });

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const performFullSync = async () => {
    try {
      setSyncProgress({ current: 0, total: 3333, active: true });
      setError(null);

      // Get initial stats
      const statsRes = await fetch('/api/nft-stats');
      let statsData = { totalSupply: 3333, _isMock: true };
      if (statsRes.ok) statsData = await statsRes.json();
      const activeSlug = (statsData as any).slug || '10k-squad';

      // Fetch Traits Summary
      const traitsRes = await fetch('/api/traits');
      const traitsSummary = traitsRes.ok ? await traitsRes.json() : { traits: {} };

      let allNFTs: any[] = [];
      let nextCursor: string | null = null;
      let hasMore = true;
      let totalFetched = 0;
      const MAX_NFTS = 3333; // Full sync target

      while (hasMore && totalFetched < MAX_NFTS) {
        let url = `/api/nfts?slug=${activeSlug}`;
        if (nextCursor) url += `&next=${nextCursor}`;

        const res = await fetch(url);
        if (!res.ok) {
          console.warn('Batch fetch failed, stopping at:', totalFetched);
          break;
        }
        
        const data = await res.json();
        const batch = data.nfts || data.assets || [];
        allNFTs = [...allNFTs, ...batch];
        totalFetched += batch.length;
        
        setSyncProgress(prev => ({ ...prev, current: totalFetched, total: MAX_NFTS }));
        
        nextCursor = data.next;
        hasMore = !!nextCursor && totalFetched < MAX_NFTS;
        
        if (hasMore) await new Promise(r => setTimeout(r, 500)); 
      }

      const { traits: finalResult, allNFTs: processedNFTs } = processAllData(allNFTs, statsData, traitsSummary);
      setTraits(finalResult);
      setFullNFTs(processedNFTs);
      setCollectionStats(statsData);
      
      const sessionData = {
        traits: finalResult,
        stats: statsData,
        fullNFTs: processedNFTs,
        timestamp: Date.now()
      };
      
      localStorage.setItem('10k-squad-traits-data', JSON.stringify(sessionData));
      setSyncProgress(prev => ({ ...prev, active: false }));
    } catch (err) {
      console.error('Full Sync Error:', err);
      setError('Sync partially completed. Some data might be missing.');
      setSyncProgress(prev => ({ ...prev, active: false }));
    }
  };

  const downloadJSON = () => {
    const cached = localStorage.getItem('10k-squad-traits-data');
    if (!cached) return alert('Sync data first!');
    
    const blob = new Blob([cached], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'traits-data.json'; // Simpler name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processAllData = (allNFTs: any[], statsData: any, traitsSummary: any) => {
    const traitMetadataMap: Record<string, { image: string, url: string, category: string, name: string, count: number }> = {};
    const activeSlug = statsData?.slug || '10k-squad';
    
    allNFTs.forEach((nft: any) => {
      const image = nft.image_url || nft.display_image_url || nft.image_preview_url;
      const nftTraits = nft.traits || [];
      nftTraits.forEach((t: any) => {
        const type = String(t.trait_type || '').trim();
        const val = String(t.value || '').trim();
        if (!type || !val) return;
        
        const key = `${type.toLowerCase()}:${val.toLowerCase()}`;
        if (!traitMetadataMap[key]) {
          traitMetadataMap[key] = {
            image: image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
            url: nft.opensea_url || `https://opensea.io/assets/ethereum/${nft.contract || '0x495f947276749ce646f68ac8c248420045cb7b5e'}/${nft.identifier || nft.token_id}`,
            category: type,
            name: val,
            count: 0
          };
        }
        traitMetadataMap[key].count++;
      });
    });

    const finalMappedTraits: Trait[] = [];
    const seenKeys = new Set<string>();

    if (traitsSummary?.traits) {
      Object.entries(traitsSummary.traits).forEach(([category, values]: [string, any]) => {
        if (typeof values === 'object' && values !== null) {
          Object.entries(values).forEach(([valueName, stats]: [string, any]) => {
            const count = typeof stats === 'object' ? (stats.count || 0) : (typeof stats === 'number' ? stats : 0);
            const totalItems = (statsData as any).totalSupply || 3333;
            const rarityPercent = (count / totalItems) * 100;
            const tier = getTier(rarityPercent);
            const lookupKey = `${String(category).trim().toLowerCase()}:${String(valueName).trim().toLowerCase()}`;
            const metadata = traitMetadataMap[lookupKey];
            seenKeys.add(lookupKey);

            finalMappedTraits.push({
              id: `${category}-${valueName}`,
              name: String(valueName),
              category: String(category),
              tier: tier,
              image: metadata?.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
              holders: count,
              rarity: `${rarityPercent.toFixed(2)}%`,
              opensea_url: metadata?.url || `https://opensea.io/collection/${activeSlug}`
            });
          });
        }
      });
    }

    Object.entries(traitMetadataMap).forEach(([key, meta]) => {
      if (!seenKeys.has(key)) {
        const count = meta.count || 1;
        const totalItems = (statsData as any).totalSupply || 3333;
        const rarityPercent = (count / totalItems) * 100;
        finalMappedTraits.push({
          id: `ext-${key}`,
          name: meta.name,
          category: meta.category,
          tier: getTier(rarityPercent),
          image: meta.image,
          holders: count,
          rarity: `${rarityPercent.toFixed(2)}%`,
          opensea_url: meta.url
        });
      }
    });

    return {
      traits: finalMappedTraits.length > 0 ? finalMappedTraits : MOCK_TRAITS,
      allNFTs: allNFTs
    };
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // 1. Try to load from local file (uploaded by user)
        try {
          const localRes = await fetch('/traits-data.json');
          if (localRes.ok) {
            const localData = await localRes.json();
            console.log('Loaded local traits data:', localData.traits?.length, 'traits found');
            
            if (localData.traits && localData.traits.length > 0) {
              // If we have fullNFTs but only few traits, we can try to re-process to get better coverage
              if (localData.fullNFTs && localData.traits.length < 10) {
                console.log('Few traits found in local file, re-processing fullNFTs...');
                const { traits: reprocessedTraits, allNFTs: processed } = processAllData(localData.fullNFTs, localData.stats, { traits: {} });
                setTraits(reprocessedTraits);
                setFullNFTs(processed);
              } else {
                setTraits(localData.traits);
                if (localData.fullNFTs) setFullNFTs(localData.fullNFTs);
              }
              setCollectionStats(localData.stats);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.log('No static traits-data.json found or invalid format');
        }

        // 2. Try to load from cache
        const cached = localStorage.getItem('10k-squad-traits-data');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.traits && parsed.traits.length > 0 && (Date.now() - parsed.timestamp < 3600000)) {
              setTraits(parsed.traits);
              if (parsed.fullNFTs) setFullNFTs(parsed.fullNFTs);
              setCollectionStats(parsed.stats);
              setLoading(false);
              // Background refresh
              refreshData();
              return;
            }
          } catch (e) {
            console.warn('Cache corrupted');
          }
        }

        await refreshData();
      } catch (err) {
        console.error('Error in fetchAllData:', err);
        setError('Connected to local API, but data sync failed. Showing fallback traits.');
        setTraits(MOCK_TRAITS);
      } finally {
        setLoading(false);
      }
    };

    const refreshData = async () => {
      try {
        // Fetch Stats
        const statsRes = await fetch('/api/nft-stats');
        let statsData = null;
        if (statsRes.ok) {
          statsData = await statsRes.json();
          setCollectionStats(statsData);
        }

        // Fetch collection traits summary
        const traitsResponse = await fetch('/api/traits');
        
        if (!traitsResponse.ok) {
          console.warn('Traits API fail, falling back');
          setTraits(MOCK_TRAITS);
          return;
        }
        const traitsData = await traitsResponse.json();
        const activeSlug = traitsData.slug || 'the-10k-squad-350905768';
        
        // Advanced Extraction: Build a map of Category-Value to Image/URL
        const traitMetadataMap: Record<string, { image: string, url: string, category: string, name: string }> = {};
        
        const nftToUrlLocal = (nft: any, slug: string) => {
          const id = nft.identifier || nft.token_id;
          const contract = nft.contract || '0x495f947276749ce646f68ac8c248420045cb7b5e';
          return id ? `https://opensea.io/assets/ethereum/${contract}/${id}` : `https://opensea.io/collection/${slug}`;
        };

        const processNFTs = (nfts: any[]) => {
          nfts.forEach((nft: any) => {
            const image = nft.image_url || nft.display_image_url || nft.image_preview_url;
            if (!image) return;
            
            const nftTraits = nft.traits || [];
            nftTraits.forEach((t: any) => {
              const type = String(t.trait_type || '').trim();
              const val = String(t.value || '').trim();
              if (!type || !val) return;
              
              const key = `${type.toLowerCase()}:${val.toLowerCase()}`;
              if (!traitMetadataMap[key]) {
                traitMetadataMap[key] = {
                  image: image,
                  url: nft.opensea_url || nftToUrlLocal(nft, activeSlug),
                  category: type,
                  name: val
                };
              }
            });
          });
        };

        // Fetch Batch 1
        const res1 = await fetch(`/api/nfts?slug=${activeSlug}`);
        let currentFullNFTs: any[] = [];
        if (res1.ok) {
          const data1 = await res1.json();
          const list1 = data1.nfts || data1.assets || [];
          currentFullNFTs = [...list1];
          processNFTs(list1);

          // Fetch Batch 2 to increase coverage
          if (data1.next) {
            try {
              const res2 = await fetch(`/api/nfts?slug=${activeSlug}&next=${data1.next}`);
              if (res2.ok) {
                const data2 = await res2.json();
                const list2 = data2.nfts || data2.assets || [];
                currentFullNFTs = [...currentFullNFTs, ...list2];
                processNFTs(list2);
              }
            } catch (e) {
              console.warn('Batch 2 fetch failed');
            }
          }
        }
        setFullNFTs(currentFullNFTs);

        // Merge with stats from traits summary
        const mappedTraits: Trait[] = [];
        const seenKeys = new Set<string>();

        if (traitsData.traits) {
          Object.entries(traitsData.traits).forEach(([category, values]: [string, any]) => {
            if (typeof values === 'object' && values !== null) {
              Object.entries(values).forEach(([valueName, stats]: [string, any]) => {
                // OpenSea V2 can return number or { count: number }
                const count = typeof stats === 'object' ? (stats.count || 0) : (typeof stats === 'number' ? stats : 0);
                const totalItems = statsData?.totalSupply || 3333;
                const rarityPercent = (count / totalItems) * 100;
                const tier = getTier(rarityPercent);
                
                const lookupKey = `${String(category).trim().toLowerCase()}:${String(valueName).trim().toLowerCase()}`;
                const metadata = traitMetadataMap[lookupKey];
                seenKeys.add(lookupKey);

                mappedTraits.push({
                  id: `${category}-${valueName}`,
                  name: String(valueName),
                  category: String(category),
                  tier: tier,
                  image: metadata?.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
                  holders: count,
                  rarity: `${rarityPercent.toFixed(2)}%`,
                  opensea_url: metadata?.url || `https://opensea.io/collection/${activeSlug}`
                });
              });
            }
          });
        }

        // Add traits found in NFTs but NOT in summary
        Object.entries(traitMetadataMap).forEach(([key, meta]) => {
          if (!seenKeys.has(key)) {
            const count = 1;
            const rarityPercent = 0.01;
            mappedTraits.push({
              id: `ext-${key}`,
              name: meta.name,
              category: meta.category,
              tier: 'Common',
              image: meta.image,
              holders: count,
              rarity: `${rarityPercent.toFixed(2)}%`,
              opensea_url: meta.url
            });
          }
        });

        const finalTraits = mappedTraits.length > 0 ? mappedTraits : MOCK_TRAITS;
        setTraits(finalTraits);
        
        localStorage.setItem('10k-squad-traits-data', JSON.stringify({
          traits: finalTraits,
          stats: statsData,
          fullNFTs: currentFullNFTs,
          timestamp: Date.now()
        }));

      } catch (err) {
        console.error('Refresh error:', err);
      }
    };

    const nftToUrl = (nft: any, slug: string) => {
      if (!nft) return `https://opensea.io/collection/${slug}`;
      const id = nft.identifier || nft.token_id;
      const contract = nft.contract || '0x495f947276749ce646f68ac8c248420045cb7b5e';
      return id ? `https://opensea.io/assets/ethereum/${contract}/${id}` : `https://opensea.io/collection/${slug}`;
    };

    fetchAllData();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const categories = useMemo(() => {
    const cats = new Set(traits.map(t => t.category));
    return ['All', ...Array.from(cats)].sort();
  }, [traits]);

  const filteredTraits = useMemo(() => {
    return traits.filter(trait => {
      const matchesSearch = String(trait.name).toLowerCase().includes(search.toLowerCase());
      const matchesTier = selectedTier === 'All' || trait.tier === selectedTier;
      const matchesCategory = !selectedCategory || selectedCategory === 'All' || trait.category === selectedCategory;
      return matchesSearch && matchesTier && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rarity') return parseFloat(a.rarity) - parseFloat(b.rarity);
      if (sortBy === 'holders') return a.holders - b.holders;
      return 0;
    });
  }, [traits, search, selectedTier, selectedCategory, sortBy]);

  const traitTierMap = useMemo(() => {
    const map = new Map<string, Tier>();
    traits.forEach(t => {
      map.set(`${t.category.toLowerCase()}:${t.name.toLowerCase()}`, t.tier);
    });
    return map;
  }, [traits]);

  const filteredNFTs = useMemo(() => {
    return fullNFTs.filter(nft => {
      const name = nft.name || `10K SQUAD #${nft.identifier || nft.token_id}`;
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
      
      const nftTraits = nft.traits || [];
      
      // Category filtering for NFTs based on traits
      let matchesCategory = true;
      if (selectedCategory && selectedCategory !== 'All') {
        matchesCategory = nftTraits.some((t: any) => String(t.trait_type || '').trim() === selectedCategory);
      }

      // Tier filtering for NFTs
      let matchesTier = true;
      if (selectedTier !== 'All') {
        matchesTier = nftTraits.some((t: any) => {
          const key = `${String(t.trait_type || '').trim().toLowerCase()}:${String(t.value || '').trim().toLowerCase()}`;
          return traitTierMap.get(key) === selectedTier;
        });
      }
      
      return matchesSearch && matchesCategory && matchesTier;
    });
  }, [fullNFTs, search, selectedCategory, selectedTier, traitTierMap]);

  const totalPages = useMemo(() => {
    const items = activeTab === 'nfts' ? filteredNFTs : filteredTraits;
    return Math.ceil(items.length / itemsPerPage);
  }, [activeTab, filteredNFTs, filteredTraits, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    const items = activeTab === 'nfts' ? filteredNFTs : filteredTraits;
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [activeTab, filteredNFTs, filteredTraits, currentPage, itemsPerPage]);

  const stats = {
    total: traits.length,
    legendary: traits.filter(t => t.tier === 'Legendary').length,
    rare: traits.filter(t => t.tier === 'Rare').length,
    uncommon: traits.filter(t => t.tier === 'Uncommon').length,
    common: traits.filter(t => t.tier === 'Common').length,
  };

  const downloadImage = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTraitRarityCount = (type: string, value: string) => {
    const trait = traits.find(t => t.category.toLowerCase() === type.toLowerCase() && t.name.toLowerCase() === value.toLowerCase());
    return trait ? trait.holders : 'Unknown';
  };

  const getTraitTier = (type: string, value: string): Tier => {
    const key = `${type.toLowerCase()}:${value.toLowerCase()}`;
    return traitTierMap.get(key) || 'Common';
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-x-hidden ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <FloatingParticles />

      {/* HEADER - RESTORED ORIGINAL */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 transition-all duration-300 border-b flex items-center will-change-transform ${
        isScrolled 
          ? `backdrop-blur-xl ${theme === 'dark' ? 'bg-black/80 border-[#ff6b9d]/20 shadow-lg' : 'bg-white/80 border-black/10 shadow-lg'}`
          : `bg-transparent border-transparent`
      }`}>
        <div className="flex-1 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-black uppercase italic tracking-tighter">10K SQUAD</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center justify-center gap-8 text-[11px] uppercase font-bold tracking-[0.2em]">
          <Link to="/#gallery" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300">Gallery</Link>
          <a href="/#utility" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300">Utility</a>
          <a href="/#about" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300">About</a>
          <Link to="/traits" className="text-[#ff6b9d] hover:scale-110 transition-all font-black underline underline-offset-8">Traits</Link>
          <Link to="/game" className="opacity-50 hover:opacity-100 hover:text-[#ff6b9d] transition-all duration-300">Play</Link>
        </div>

        <div className={`flex-1 flex items-center justify-end gap-3 md:gap-6 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          <motion.button 
            whileHover={{ scale: 1.2, rotate: 15 }} 
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme} 
            className="opacity-50 hover:opacity-100 transition-all p-2"
          >
            {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMenu} 
            className="md:hidden opacity-50 hover:opacity-100 transition-all p-2"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>
      </nav>

      {/* MOBILE MENU - RESTORED ORIGINAL */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[40] pt-[100px] bg-black flex flex-col items-center justify-start gap-8 p-10 text-white md:hidden"
          >
            <nav className="flex flex-col items-center gap-8 text-xl uppercase font-black italic tracking-widest text-center">
              <Link to="/#gallery" onClick={closeMenu} className="hover:text-[#ff6b9d]">Gallery</Link>
              <Link to="/#utility" onClick={closeMenu} className="hover:text-[#ff6b9d]">Utility</Link>
              <Link to="/#about" onClick={closeMenu} className="hover:text-[#ff6b9d]">About</Link>
              <Link to="/traits" onClick={closeMenu} className="text-[#ff6b9d]">Traits</Link>
              <Link to="/game" onClick={closeMenu} className="hover:text-[#ff6b9d]">Play Game</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-32 pb-20 px-4 md:px-10 max-w-[1700px] mx-auto flex flex-col lg:flex-row gap-12">
        
        {/* LEFT SIDEBAR - Categories */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="sticky top-40 space-y-12">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:opacity-100 transition-all" />
              <input 
                type="text" 
                placeholder="Search collection..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl py-5 pl-14 pr-4 text-xs font-bold uppercase tracking-[0.2em] outline-none focus:border-[#ff6b9d]/50 shadow-inner"
              />
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 px-3 flex justify-between items-center">
                <span>Rarity Tiers</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {['All', 'Legendary', 'Rare', 'Uncommon', 'Common'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => { setSelectedTier(tier as any); setCurrentPage(1); }}
                    className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center border ${
                      selectedTier === tier 
                        ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                        : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100 hover:bg-white/10'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 px-3 flex justify-between items-center">
                <span>Trait Categories</span>
                <ChevronDown size={14} className="opacity-40" />
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => {
                  const count = cat === 'All' 
                    ? traits.length 
                    : traits.filter(t => t.category === cat).length;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat === selectedCategory ? null : cat); setCurrentPage(1); }}
                      className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        selectedCategory === cat 
                          ? 'bg-[#ff6b9d] text-white shadow-[0_10px_30px_rgba(255,107,157,0.3)] scale-[1.02]' 
                          : 'bg-white/5 opacity-60 hover:opacity-100 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col items-start translate-y-0.5">
                        <span className="leading-none mb-0.5">{cat}</span>
                        <span className={`text-[8px] opacity-40 font-sans normal-case tracking-normal ${selectedCategory === cat ? 'text-white/60' : ''}`}>{count} variants</span>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedCategory === cat ? 'bg-white' : 'bg-white/20'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {collectionStats && (
              <div className="p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent space-y-8">
                 <div className="flex justify-between items-end">
                    <div>
                        <div className="text-[9px] uppercase tracking-[0.3em] opacity-30 font-black mb-1 leading-none">Total Items</div>
                        <div className="text-3xl font-black italic tabular-nums leading-none">{collectionStats.totalSupply || '3333'}</div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <div className="text-[9px] uppercase tracking-[0.3em] opacity-30 font-black mb-1 leading-none">Floor</div>
                        <div className="text-lg font-black italic tabular-nums leading-none">{collectionStats.floorPrice || '1.91'} <span className="text-[10px] font-sans not-italic">ETH</span></div>
                    </div>
                    <div>
                        <div className="text-[9px] uppercase tracking-[0.3em] opacity-30 font-black mb-1 leading-none">Holders</div>
                        <div className="text-lg font-black italic tabular-nums leading-none">{collectionStats.holders || '1.1K'}</div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </aside>

        {/* CONTENT AREA */}
        <div className="flex-1 space-y-12">
          
          {/* NAVIGATION TABS */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 pb-8">
             <div className="flex gap-16">
                {(['nfts', 'traits'] as const).map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                    className={`text-3xl font-black uppercase italic tracking-tighter pb-8 relative transition-all ${activeTab === tab ? 'text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-1.5 after:bg-white' : 'opacity-20 hover:opacity-100'}`}
                  >
                    {tab === 'nfts' ? 'All NFT' : 'Unique Traits'}
                  </button>
                ))}
             </div>
             
             <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-[0.3em] opacity-30 text-center">
               <span>Page {currentPage} of {totalPages || 1}</span>
               <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
               <span>{(activeTab === 'nfts' ? filteredNFTs : filteredTraits).length.toLocaleString()} Items</span>
             </div>
          </div>

          <div className="relative min-h-[600px]">
             {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                   <RefreshCw className="animate-spin opacity-20" size={48} />
                   <div className="text-xs font-black uppercase tracking-[0.5em] opacity-20 animate-bounce">Accessing Database...</div>
                </div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6 md:gap-8">
                   {paginatedItems.map((item: any, i) => (
                     <motion.div 
                        key={item.id || item.identifier || i} 
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: (i % 12) * 0.04, duration: 0.4 }}
                        className="group bg-[#0f0f0f] border border-white/5 rounded-[2rem] overflow-hidden hover:border-[#ff6b9d]/50 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                      >
                        <div 
                          className="aspect-[4/5] relative overflow-hidden bg-[#1a1a1a] cursor-pointer"
                          onClick={() => setSelectedNFT(item)}
                        >
                           <img 
                            src={item.image || item.image_url || item.display_image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0"
                          />
                          {(item.rarity || item.tier) && (
                            <div className="absolute top-5 left-5">
                               <span 
                                className="px-3 py-1.5 rounded-full text-white text-[8px] font-black tracking-widest uppercase shadow-2xl backdrop-blur-md"
                                style={{ backgroundColor: item.tier ? `${TIER_COLORS[item.tier]}CC` : '#ff6b9dCC' }}
                               >
                                 {item.rarity || item.tier}
                               </span>
                            </div>
                          )}
                        </div>
                        <div className="p-6 bg-black/80 flex flex-col items-center">
                           <h3 className="text-[11px] font-black italic tracking-tighter uppercase truncate w-full text-center group-hover:text-[#ff6b9d] transition-colors">
                             {item.name || `10K SQUAD #${item.identifier || item.token_id}`}
                           </h3>
                        </div>
                     </motion.div>
                   ))}
                </div>
             )}
          </div>

          {/* ARCADE PAGINATION */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-20">
               <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#ff6b9d] transition-all active:scale-90"
               >
                 <ArrowUpDown className="w-5 h-5 rotate-90" />
               </button>
               
               <div className="flex gap-2">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-14 h-14 rounded-2xl text-sm font-black transition-all ${currentPage === i + 1 ? 'bg-[#ff6b9d] text-white shadow-2xl' : 'bg-[#1a1a1a] opacity-30 hover:opacity-100 border border-white/5 hover:border-white/20'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {totalPages > 5 && <div className="w-14 h-14 flex items-center justify-center opacity-20 font-black">...</div>}
                  {totalPages > 5 && (
                    <button 
                      onClick={() => setCurrentPage(totalPages)}
                      className={`w-14 h-14 rounded-2xl text-sm font-black transition-all ${currentPage === totalPages ? 'bg-[#ff6b9d] text-white shadow-2xl' : 'bg-[#1a1a1a] opacity-30 hover:opacity-100 border border-white/5'}`}
                    >
                      {totalPages}
                    </button>
                  )}
               </div>

               <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#ff6b9d] transition-all active:scale-90"
               >
                 <ArrowUpDown className="w-5 h-5 -rotate-90" />
               </button>
            </div>
          )}
        </div>
      </main>

      {/* NFT DETAIL MODAL */}
      <AnimatePresence>
        {selectedNFT && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl bg-[#0f0f0f] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedNFT(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-[#ff6b9d] transition-all"
              >
                <X size={24} />
              </button>

              {/* LEFT: Image & Actions */}
              <div className="w-full md:w-[45%] bg-[#151515] p-6 lg:p-10 flex flex-col gap-8 border-r border-white/5 overflow-y-auto">
                <div className="aspect-square rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 bg-[#050505] flex items-center justify-center">
                  <img 
                    src={selectedNFT.image || selectedNFT.image_url || selectedNFT.display_image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'} 
                    alt={selectedNFT.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => downloadImage(selectedNFT.image || selectedNFT.image_url || selectedNFT.display_image_url, selectedNFT.name || 'nft')}
                    className="flex-1 flex items-center justify-center gap-3 bg-white text-black h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#ff6b9d] hover:text-white transition-all active:scale-95 shadow-lg"
                  >
                    <RefreshCw className="rotate-180" size={18} />
                    Download
                  </button>
                  <button 
                    onClick={() => copyToClipboard(selectedNFT.image || selectedNFT.image_url || selectedNFT.display_image_url)}
                    className="flex-1 flex items-center justify-center gap-3 bg-white/5 border border-white/10 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all active:scale-95 shadow-lg"
                  >
                    {copied ? <RefreshCw className="text-green-500" size={18} /> : <ExternalLink size={18} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* RIGHT: Metadata & Traits */}
              <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
                <div className="space-y-2 mb-10">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="px-3 py-1 bg-[#ff6b9d]/20 text-[#ff6b9d] rounded-full text-[9px] font-black uppercase tracking-widest">NFT Identifier: {selectedNFT.identifier || selectedNFT.token_id || '#0'}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-tight mb-4">
                    {selectedNFT.name || `10K SQUAD #${selectedNFT.identifier || selectedNFT.token_id}`}
                  </h2>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Owned by</span>
                    <span className="font-mono text-[#ff6b9d] text-sm break-all font-bold">
                      {selectedNFT.owners?.[0]?.address || selectedNFT.owner || 'Ox' + Math.random().toString(16).slice(2, 42)}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 border-b border-white/5 pb-4">Traits Analysis</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(selectedNFT.traits || []).map((t: any, idx: number) => {
                      const tier = getTraitTier(t.trait_type, t.value);
                      return (
                        <div key={idx} className="group p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-[#ff6b9d]/30 transition-all hover:bg-white/[0.07]">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">{t.trait_type}</span>
                            <span 
                              className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                              style={{ color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}40` }}
                            >
                              {tier}
                            </span>
                          </div>
                          <div className="text-lg font-black uppercase italic tracking-tight mb-2">{t.value}</div>
                          <div className="text-[10px] font-bold opacity-30 group-hover:opacity-60 transition-opacity">
                            {getTraitRarityCount(t.trait_type, t.value)} items share this
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5">
                   <a 
                    href={selectedNFT.opensea_url || `https://opensea.io/assets/ethereum/${selectedNFT.contract || '0x495f947276749ce646f68ac8c248420045cb7b5e'}/${selectedNFT.identifier || selectedNFT.token_id}`}
                    target="_blank"
                    className="flex items-center justify-between p-6 bg-white/5 rounded-3xl group hover:bg-[#2081e2] transition-all"
                   >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#2081e2] flex items-center justify-center p-2">
                           <img src="https://storage.googleapis.com/opensea-static/Logomark/Logomark-White.svg" alt="OS" className="w-full h-full" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Marketplace Profile</span>
                      </div>
                      <ExternalLink size={20} className="opacity-40 group-hover:opacity-100" />
                   </a>
                </div>
              </div>
            </motion.div>
            
            {/* Backdrop click to close */}
            <div className="absolute inset-0 z-[-1] bg-black/80 backdrop-blur-sm" onClick={() => setSelectedNFT(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="px-6 md:px-10 max-w-7xl mx-auto pb-20 border-t border-current/5 pt-20 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
             <span className="text-2xl font-black uppercase italic tracking-tighter">10K SQUAD</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.5em] opacity-20">
            2026 THE 10K SQUAD // ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

      {/* BG DECOR */}
      <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-20%] right-[-10%] w-[70%] aspect-square rounded-full blur-[150px] ${theme === 'dark' ? 'bg-purple-900/10' : 'bg-purple-100/20'}`} />
        <div className={`absolute bottom-[-10%] left-[-20%] w-[60%] aspect-square rounded-full blur-[150px] ${theme === 'dark' ? 'bg-pink-900/10' : 'bg-pink-100/20'}`} />
      </div>
    </div>
  );
}
