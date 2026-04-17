import axios, { AxiosError } from "axios";

// ============================================================
// Aruba Central API Client with Automatic Token Refresh
// Refresh token every 110 minutes (tokens expire after 2 hours)
// ============================================================

type ArubaTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

const baseUrl = (process.env.ARUBA_BASE_URL ?? "").trim().replace(/\/+$/, "");
const clientId = (process.env.ARUBA_CLIENT_ID ?? "").trim();
const clientSecret = (process.env.ARUBA_CLIENT_SECRET ?? "").trim();

// In-memory token state (survives hot reloads in dev via module-level singleton)
let _accessToken: string = (process.env.ARUBA_ACCESS_TOKEN ?? "").trim();
let _refreshToken: string = (process.env.ARUBA_REFRESH_TOKEN ?? "").trim();
let _tokenExpiresAt: number = Date.now() + 110 * 60 * 1000; // assume current token valid until first refresh cycle
let _refreshTimer: ReturnType<typeof setInterval> | null = null;
let _isRefreshing = false;

// ── Token Refresh Logic ──────────────────────────────────────
const refreshAccessToken = async (): Promise<boolean> => {
  if (_isRefreshing) return false;
  if (!_refreshToken || !clientId || !clientSecret || !baseUrl) {
    console.warn("[Aruba Auth] Missing refresh credentials — skipping refresh.");
    return false;
  }

  _isRefreshing = true;

  try {
    const url = `${baseUrl}/oauth2/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: _refreshToken,
    });

    const response = await axios.post<ArubaTokenResponse>(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });

    _accessToken = response.data.access_token;
    // Aruba returns the same or new refresh token — always update it
    if (response.data.refresh_token) {
      _refreshToken = response.data.refresh_token;
    }
    // Schedule next refresh 10 minutes before expiry
    _tokenExpiresAt = Date.now() + response.data.expires_in * 1000;

    console.log(
      `[Aruba Auth] ✅ Token refreshed successfully. Expires in ${Math.round(response.data.expires_in / 60)} minutes.`
    );
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      `[Aruba Auth] ❌ Token refresh FAILED (${axiosError.response?.status || "NETWORK_ERROR"}) — will retry at next cycle.`
    );
    return false;
  } finally {
    _isRefreshing = false;
  }
};

// ── Auto-Refresh Scheduler: every 110 minutes ────────────────
const REFRESH_INTERVAL_MS = 110 * 60 * 1000; // 110 minutes

const startTokenRefreshScheduler = () => {
  if (_refreshTimer) return; // already running
  if (!_refreshToken) return; // no refresh token configured

  console.log("[Aruba Auth] 🔄 Token auto-refresh scheduler started (every 110 minutes).");

  // Do an immediate refresh if we're close to expiry (< 10 min left)
  const timeUntilExpiry = _tokenExpiresAt - Date.now();
  if (timeUntilExpiry < 10 * 60 * 1000) {
    refreshAccessToken();
  }

  _refreshTimer = setInterval(async () => {
    console.log("[Aruba Auth] ⏰ Scheduled token refresh triggered.");
    await refreshAccessToken();
  }, REFRESH_INTERVAL_MS);

  // Ensure timer doesn't block Node.js process from exiting
  if (_refreshTimer.unref) _refreshTimer.unref();
};

// Start the scheduler as soon as this module is imported
startTokenRefreshScheduler();

// ── Get Current Valid Token ──────────────────────────────────
const getValidToken = async (): Promise<string | null> => {
  if (!_accessToken) return null;

  // If token is expired or expires in < 5 min, force refresh now
  const timeUntilExpiry = _tokenExpiresAt - Date.now();
  if (timeUntilExpiry < 5 * 60 * 1000) {
    console.log("[Aruba Auth] ⚠️ Token near expiry — forcing immediate refresh.");
    await refreshAccessToken();
  }

  return _accessToken || null;
};

// ── Main API Request Function ────────────────────────────────
export const arubaGet = async <T>(endpoint: string): Promise<T | null> => {
  const token = await getValidToken();
  if (!token || !baseUrl) {
    console.warn(`[Aruba API] No valid token — skipping request: ${endpoint}`);
    return null;
  }

  try {
    const response = await axios.get<T>(`${baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    // On 401, immediately try to refresh then don't retry (avoids loop)
    if (axiosError.response?.status === 401) {
      console.warn(`[Aruba API] 401 on ${endpoint} — triggering emergency token refresh.`);
      await refreshAccessToken();
    }
    console.error(`[Aruba API] Request failed: ${endpoint}`, error);
    return null;
  }
};

export const arubaConfigState = {
  hasAuth: Boolean(_accessToken || (_refreshToken && clientId && clientSecret)),
};
