import axios from 'axios';

const baseUrl = 'https://apigw-apacsouth.central.arubanetworks.com';
const clientId = 'G2COnGS3reIllsZMfCqDT08p39vQ7Vdf';
const clientSecret = 'WKlI9zZYFVx15EFEI6dyDVb3V7yPdloF';
const customerId = '8ac6ad926d0011f0b79f6e65f0427cc2';

async function tryAuth(name, config) {
  try {
    const res = await axios.post(`${baseUrl}/oauth2/token`, config.data, { headers: config.headers, params: config.params });
    console.log(`[SUCCESS] ${name} -> access_token length: ${res.data.access_token.length}`);
    return res.data.access_token;
  } catch (e) {
    console.log(`[FAILED] ${name} -> ${e.response?.status} : ${JSON.stringify(e.response?.data) || e.message}`);
    return null;
  }
}

async function run() {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  // Variation 1: Query param + form URL encoded
  await tryAuth('Var 1: customer_id in query, form body', {
    params: { customer_id: customerId },
    data: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  // Variation 2: Basic auth + form body
  await tryAuth('Var 2: Basic auth, customer_id in body', {
    data: new URLSearchParams({ grant_type: 'client_credentials', customer_id: customerId }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${basicAuth}` }
  });

  // Variation 3: customer_id as form param, no client_id secret (used basic)
  await tryAuth('Var 3: JSON body', {
    data: { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, customer_id: customerId },
    headers: { 'Content-Type': 'application/json' }
  });

  // Variation 4: Postman format
  await tryAuth('Var 4: Refresh token guess?', {
    data: new URLSearchParams({ grant_type: 'password', username: customerId, password: clientSecret }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
}
run();
