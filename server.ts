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
    // SEMPRE RETORNAR DADOS MANUAIS CONFORME SOLICITADO PELO USUÁRIO
    // "vamo fazer manualmente"
    const manualStats = {
      totalSupply: 3333,
      floorPrice: 5.25,
      holders: 2850,
      totalVolume: 650000,
      _isMock: true,
      _note: "Manual updates as requested"
    };

    const apiKey = process.env.OPENSEA_API_KEY || process.env.VITE_OPENSEA_API_KEY;
    const collectionSlug = 'the-10k-squad-350905768';

    if (!apiKey) {
      return res.json(manualStats);
    }

    try {
      // Se tiver API Key, ainda tentamos buscar para ver se há atualizações automáticas,
      // mas usaremos os valores manuais como BASE se a API falhar ou retornar zeros.
      console.log(`Fetching stats for slug: ${collectionSlug} using API Key...`);
      const response = await fetch(`https://api.opensea.io/api/v2/collections/${collectionSlug}/stats`, {
        headers: { 
          'X-API-KEY': apiKey,
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        return res.json(manualStats);
      }
      
      const data = await response.json();
      const total = data.total || data || {};
      
      // Mesclar dados da API com os manuais (priorizando manuais se API retornar 0)
      res.json({
        totalSupply: data.total_supply || total.total_supply || manualStats.totalSupply,
        floorPrice: total.floor_price || data.floor_price || manualStats.floorPrice,
        holders: total.num_owners || data.num_owners || total.owners || manualStats.holders,
        totalVolume: manualStats.totalVolume, // Volume fixo em 650k conforme solicitado
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
