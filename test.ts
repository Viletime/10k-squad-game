import fs from 'fs';
fetch('https://api.opensea.io/api/v2/collections/the-10k-squad-350905768/stats', {
  headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY }
}).then(r => r.json()).then(console.log).catch(console.error);
