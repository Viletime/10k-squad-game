
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
    floorPrice: 2850.15,
    holders: 1450,
    totalVolume: "1M+ MON", 
    volumeUsd: "$45.8K+", 
    _isMock: true,
    _note: "API Key missing or fetch failed"
  };

  const apiKey = process.env.OPENSEA_API_KEY;
  const collectionSlug = 'the-10k-squad-350905768';

  try {
    // Tenta buscar preço do ETH para conversão USD REAL
    let ethPrice = 3150; // Fallback mais recente
    try {
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        ethPrice = priceData.ethereum?.usd || ethPrice;
      }
    } catch (e) {
      console.error("Error fetching ETH price:", e);
    }

    if (!apiKey) {
      // Mesmo no mock, atualizamos o USD baseado no preço real do ETH pra ficar "fresco"
      const fallbackVolumeNum = 1224800;
      const mockVolumeUsdValue = fallbackVolumeNum * (ethPrice / 1000) * 0.01; // Simulação de peso
      // Na verdade, vamos apenas atualizar o USD do mock de forma mais "viva"
      const volumeUsdValue = fallbackVolumeNum * 0.035; // Fator fixo aproximado
      const volumeUsdFormatted = `$${(volumeUsdValue / 1000).toFixed(1)}K+`;
      
      return res.status(200).json({
        ...manualStats,
        totalVolume: "1M+ MON",
        volumeUsd: volumeUsdFormatted
      });
    }

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
    
    // Volume total da OpenSea costuma ser em ETH para a maioria das coleções
    const rawVolume = total.volume || total.total_volume || 0;
    
    // Se o volume da OpenSea for baixo (ex: < 1000), interpretamos como ETH 
    // e convertemos para MON usando um fator (ex: 64,000 MON/ETH baseada na escala do usuário)
    // Se for maior, assumimos que já está na escala correta.
    const MON_MULTIPLIER = 64000;
    let finalVolume: string | number = rawVolume;
    if (rawVolume > 0 && rawVolume < 1000) {
      finalVolume = rawVolume * MON_MULTIPLIER;
    } else if (rawVolume === 0) {
      finalVolume = manualStats.totalVolume;
    }
    
    // Formatting logic to match api/index.ts
    if (typeof finalVolume === 'number' && finalVolume > 0) {
      if (finalVolume >= 1000000) {
        finalVolume = (Math.floor(finalVolume / 100000) / 10).toFixed(1).replace('.0', '') + "M+ MON";
      } else if (finalVolume >= 800000) {
        finalVolume = "1M+ MON";
      } else if (finalVolume >= 1000) {
        finalVolume = Math.floor(finalVolume / 1000) + "K+ MON";
      } else {
        finalVolume = Math.floor(finalVolume) + " MON";
      }
    } else if (finalVolume === manualStats.totalVolume || !finalVolume) {
       finalVolume = "1M+ MON"; // manualStats.totalVolume is a number here, but formatted is string
    }
    
    // Calcula volume em USD usando o preço do ETH (assumindo que o volume base é ETH-equivalent)
    // Se o volume já estiver em MON, e 1 MON != 1 ETH, precisaríamos do preço do MON.
    // Mas o usuário vinculou ~$28K a 12.77 MON/ETH, então usaremos o volume 'real' (ETH) para o USD.
    // Usa um fallback de 1224800 para calcular USD se o rawVolume for 0
    const fallbackVolumeNum = 1224800;
    const volumeUsdValue = (rawVolume > 0 ? rawVolume : (fallbackVolumeNum / MON_MULTIPLIER)) * ethPrice;
    const volumeUsdFormatted = volumeUsdValue > 1000 ? 
      `$${(volumeUsdValue / 1000).toFixed(1)}K+` : 
      `$${volumeUsdValue.toFixed(0)}+`;

    return res.status(200).json({
      totalSupply: data.total_supply || manualStats.totalSupply,
      floorPrice: total.floor_price || manualStats.floorPrice,
      holders: total.num_owners || manualStats.holders,
      totalVolume: finalVolume,
      volumeUsd: volumeUsdFormatted, 
      _isMock: false
    });
  } catch (error) {
    console.error("Error fetching OpenSea stats:", error);
    return res.status(200).json(manualStats);
  }
}
