
export default async function handler(req: any, res: any) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const manualStats = {
    totalSupply: 3333,
    floorPrice: 1917.15,
    holders: 1100,
    totalVolume: 777000,
    volumeUsd: "$23K+",
    _isMock: true,
    _note: "API Key missing or fetch failed"
  };

  const apiKey = process.env.OPENSEA_API_KEY;
  const collectionSlug = 'the-10k-squad-350905768';

  if (!apiKey) {
    return res.status(200).json(manualStats);
  }

  try {
    const response = await fetch(`https://api.opensea.io/api/v2/collections/${collectionSlug}/stats`, {
      headers: { 
        'X-API-KEY': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.status(200).json(manualStats);
    }
    
    const data = await response.json();
    const total = data.total || {};
    
    return res.status(200).json({
      totalSupply: data.total_supply || manualStats.totalSupply,
      floorPrice: total.floor_price || manualStats.floorPrice,
      holders: total.num_owners || manualStats.holders,
      totalVolume: manualStats.totalVolume, // Mantido fixo
      volumeUsd: manualStats.volumeUsd, 
      _isMock: false
    });
  } catch (error) {
    console.error("Error fetching OpenSea stats:", error);
    return res.status(200).json(manualStats);
  }
}
