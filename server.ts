import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON
  app.use(express.json());

  // API route for collection traits
  app.get("/api/traits", async (req, res) => {
    const apiKey = process.env.OPENSEA_API_KEY;
    const slugs = ['the-10k-squad-350905768', '10k-squad'];

    console.log(`[Trait API] Request received. API Key presence: ${!!apiKey}`);

    if (!apiKey) {
      return res.status(401).json({ error: "API Key missing" });
    }

    for (const collectionSlug of slugs) {
      try {
        console.log(`[Trait API] Trying slug: ${collectionSlug}`);
        const response = await fetch(`https://api.opensea.io/api/v2/collections/${collectionSlug}/traits`, {
          headers: { 
            'X-API-KEY': apiKey,
            'accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[Trait API] Success for ${collectionSlug}`);
          return res.json({ ...data, slug: collectionSlug });
        } else {
           console.warn(`[Trait API] Failed for ${collectionSlug}: ${response.status}`);
        }
      } catch (error) {
        console.error(`[Trait API] Fetch error for ${collectionSlug}:`, error);
      }
    }
    
    res.status(500).json({ error: "Failed to fetch traits after trying all slugs" });
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
      
      console.log(`Fetching NFTs: ${url}`);
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
      console.error("Error fetching OpenSea NFTs:", error);
      res.status(500).json({ error: "Failed to fetch NFTs" });
    }
  });

  // API route for NFT stats (Server-side proxy to OpenSea)
  app.get("/api/nft-stats", async (req, res) => {
    // Dados manuais conforme solicitado pelo usuário como fallback
    const manualStats = {
      totalSupply: 3333,
      floorPrice: 1.91,
      holders: 1100,
      totalVolume: 777000,
      volumeUsd: "$23K+",
      _isMock: true,
      _note: "API Key missing or fetch failed"
    };

    const apiKey = process.env.OPENSEA_API_KEY;
    const slugs = ['the-10k-squad-350905768', '10k-squad'];

    if (!apiKey) {
      return res.json(manualStats);
    }

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
