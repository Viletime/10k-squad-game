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

  // API route for NFT stats (Server-side proxy to OpenSea)
  app.get("/api/nft-stats", async (req, res) => {
    // Dados manuais conforme solicitado pelo usuário como fallback
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
      return res.json(manualStats);
    }

    try {
      console.log(`Fetching stats for slug: ${collectionSlug} using API Key...`);
      const response = await fetch(`https://api.opensea.io/api/v2/collections/${collectionSlug}/stats`, {
        headers: { 
          'X-API-KEY': apiKey,
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`OpenSea API responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log("OpenSea API Data received:", JSON.stringify(data));
      
      const total = data.total || {};
      
      // OpenSea V2 stats are under the 'total' key
      res.json({
        totalSupply: data.total_supply || manualStats.totalSupply,
        floorPrice: total.floor_price || manualStats.floorPrice,
        holders: total.num_owners || manualStats.holders,
        totalVolume: manualStats.totalVolume, // Mantido fixo em 777k como solicitado
        volumeUsd: manualStats.volumeUsd, 
        _isMock: false
      });
    } catch (error) {
      console.error("Error fetching OpenSea stats:", error);
      res.json(manualStats);
    }
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
