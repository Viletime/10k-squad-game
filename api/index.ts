import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware para JSON
app.use(express.json());

// API route for collection traits
app.get("/api/traits", async (req, res) => {
  const apiKey = process.env.OPENSEA_API_KEY;
  const slugs = ['the-10k-squad-350905768', '10k-squad'];

  console.log(`[Trait API] Request received.`);

  if (!apiKey) {
    console.error("[Trait API] OPENSEA_API_KEY is missing in environment");
    return res.status(401).json({ error: "API Key missing" });
  }

  for (const collectionSlug of slugs) {
    try {
      const response = await fetch(`https://api.opensea.io/api/v2/collections/${collectionSlug}/traits`, {
        headers: { 
          'X-API-KEY': apiKey,
          'accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return res.json({ ...data, slug: collectionSlug });
      }
    } catch (error) {
      console.error(`[Trait API] Fetch error for ${collectionSlug}:`, error);
    }
  }
  
  res.status(500).json({ error: "Failed to fetch traits" });
});

// API route for collection NFTs
app.get("/api/nfts", async (req, res) => {
  const apiKey = process.env.OPENSEA_API_KEY;
  const collectionSlug = req.query.slug as string || 'the-10k-squad-350905768';
  const nextToken = req.query.next as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API Key missing" });
  }

  try {
    let url = `https://api.opensea.io/api/v2/collection/${collectionSlug}/nfts?limit=100`;
    if (nextToken) url += `&next=${nextToken}`;
    
    const response = await fetch(url, {
      headers: { 
        'X-API-KEY': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error(`OpenSea API responded with ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch NFTs" });
  }
});

// API route for single NFT details (to get owners)
app.get("/api/nft-details", async (req, res) => {
  const apiKey = process.env.OPENSEA_API_KEY;
  const chain = req.query.chain as string || 'ethereum';
  const contract = req.query.address as string;
  const identifier = req.query.identifier as string;

  console.log(`[NFT Details] Request for ${chain}/${contract}/${identifier}`);

  if (!apiKey) {
    console.error("[NFT Details] OPENSEA_API_KEY missing");
    return res.status(401).json({ error: "API Key missing" });
  }

  if (!contract || !identifier) {
    return res.status(400).json({ error: "Contract address and identifier are required" });
  }

  try {
    const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${contract}/nfts/${identifier}`;
    const response = await fetch(url, {
      headers: { 
        'X-API-KEY': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[NFT Details] OpenSea Error ${response.status}: ${errorText}`);
      throw new Error(`OpenSea API error ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("[NFT Details] Exception:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch NFT details" });
  }
});

// API route for NFT stats
app.get("/api/nft-stats", async (req, res) => {
  const manualStats = {
    totalSupply: 3333,
    floorPrice: 1.91,
    holders: 1100,
    totalVolume: 777000,
    volumeUsd: "$23K+",
    _isMock: true
  };

  const apiKey = process.env.OPENSEA_API_KEY;
  const slugs = ['the-10k-squad-350905768', '10k-squad'];

  if (!apiKey) return res.json(manualStats);

  for (const collectionSlug of slugs) {
    try {
      const response = await fetch(`https://api.opensea.io/api/v2/collections/${collectionSlug}/stats`, {
        headers: { 
          'X-API-KEY': apiKey,
          'accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const total = data.total || {};
        return res.json({
          totalSupply: data.total_supply || manualStats.totalSupply,
          floorPrice: total.floor_price || manualStats.floorPrice,
          holders: total.num_owners || manualStats.holders,
          totalVolume: manualStats.totalVolume, 
          volumeUsd: manualStats.volumeUsd, 
          slug: collectionSlug,
          _isMock: false
        });
      }
    } catch (error) {
      console.error(`Error fetching stats for ${collectionSlug}:`, error);
    }
  }
  
  res.json(manualStats);
});

// Development vs Production
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  async function startDev() {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development server running on http://localhost:${PORT}`);
    });
  }
  startDev();
} else {
  // Static files for production
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  
  // No need to app.listen() here on Vercel, we export the app
  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export default app;
