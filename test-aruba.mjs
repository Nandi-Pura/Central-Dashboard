import axios from 'axios';

const baseUrl = 'https://apigw-apacsouth.central.arubanetworks.com';
const token = 'AooqGlJrn8JrWTc7YKLjfP134Ojm4VSw';

async function test() {
  const urls = [
    "/monitoring/v2/networks",
    "/monitoring/v2/networks/bandwidth_usage?network=PTPN3-IT",
    "/monitoring/v2/aps",
    "/monitoring/v2/bssids",
    "/monitoring/v2/aps/bandwidth_usage/topn",
    "/monitoring/v3/aps/bandwidth_usage",
    "/monitoring/v1/clients/wireless",
    "/monitoring/v1/clients/wired",
    "/monitoring/v2/clients?timerange=3H&client_type=WIRELESS&client_status=CONNECTED",
    "/monitoring/v1/clients/bandwidth_usage",
    "/monitoring/v1/clients/bandwidth_usage/topn",
    "/monitoring/v1/clients/count",
    "/monitoring/v1/gateways",
    "/monitoring/v1/gateways/CNTYKLC03C?stats_metric=false",
    "/monitoring/v1/gateways/CNTYKLC03R?stats_metric=false",
    "/monitoring/v1/gateways/CNTYKLC03R/tunnels?timerange=3H",
    "/monitoring/v1/gateways/CNTYKLC03C/tunnels?timerange=3H",
    "/central/v1/labels",
    "/central/v2/sites",
    "/monitoring/v1/switches",
    "/monitoring/v2/events?sort=-timestamp",
    "/branchhealth/v1/site?limit=10&column=device_total&order=desc"
  ];

  for (const u of urls) {
    try {
      const res = await axios.get(`${baseUrl}${u}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`\n[SUCCESS] ${u}`);
      console.log(`Response Keys: ${Object.keys(res.data).join(", ")}`);
      
      const candidate = res.data.devices || res.data.clients || res.data.events || res.data.aps || res.data.gateways || res.data.switches || res.data.data || res.data;
      if (Array.isArray(candidate) && candidate.length > 0) {
          console.log(`Sample item keys: ${Object.keys(candidate[0]).join(", ")}`);
      } else if (!Array.isArray(candidate)) {
          console.log(`Object snapshot: ${JSON.stringify(candidate).slice(0, 150)}`);
      }
    } catch (e) {
      console.log(`\n[ERROR] ${u} -> ${e.response?.status} ${e.response?.statusText}`);
      console.log("Details:", JSON.stringify(e.response?.data));
    }
  }
}
test();
