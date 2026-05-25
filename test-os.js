import https from 'https';

const get = (slug) => {
  const options = {
    hostname: 'api.opensea.io',
    path: `/api/v2/collections/${slug}/stats`,
    headers: {
      'accept': 'application/json',
      'User-Agent': '10kSquad-App/1.0',
       'X-API-KEY': process.env.OPENSEA_API_KEY || '650ae40e254e4c23b2c6a49db2ce0eee'
    }
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(slug, data));
  });
};

get('the-10k-squad-350905768');
get('10k-squad');
