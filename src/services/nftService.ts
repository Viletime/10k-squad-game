
export interface NFTStats {
  totalSupply: number;
  floorPrice: number;
  holders: number;
  totalVolume: number;
}

/**
 * Mock service for fetching NFT statistics.
 * In a real-world scenario, this would call the OpenSea API or a custom backend.
 */
export const fetchNFTStats = async (): Promise<NFTStats & { _isMock?: boolean }> => {
  try {
    const response = await fetch(`/api/nft-stats?t=${Date.now()}`);
    if (!response.ok) throw new Error('Failed to fetch from local API');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar dados via Proxy:", error);
    // Fallback se a API falhar
    return {
      totalSupply: 3333,
      floorPrice: 5.25,
      holders: 2850,
      totalVolume: 650000,
      _isMock: true
    };
  }
};
