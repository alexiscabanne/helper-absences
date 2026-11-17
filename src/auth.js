import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpError } from './db.js';

const jwksCache = new Map();

const isLocal = request => ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);

// Verifies the Cloudflare Access JWT and returns the user's email.
// Access already blocks unauthenticated visitors at the edge; this check makes sure
// the API cannot be reached through a route Access does not cover.
export async function verifyAccess(request, env) {
  if (env.DEV_SKIP_ACCESS === '1' && isLocal(request)) return 'dev@localhost';
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new HttpError(503, 'Cloudflare Access non configuré');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new HttpError(401, 'unauthenticated');
  const issuer = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, '');
  if (!jwksCache.has(issuer)) jwksCache.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
  try {
    const { payload } = await jwtVerify(token, jwksCache.get(issuer), { issuer, audience: env.ACCESS_AUD });
    return payload.email || payload.common_name || 'access';
  } catch {
    throw new HttpError(401, 'invalid access token');
  }
}

// Verifies the MCP bearer token (constant-time comparison of SHA-256 digests)
export async function verifyMcpToken(request, env) {
  if (!env.MCP_TOKEN) throw new HttpError(503, 'MCP_TOKEN non configuré');
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(token)),
    crypto.subtle.digest('SHA-256', enc.encode(env.MCP_TOKEN)),
  ]);
  if (!token || !crypto.subtle.timingSafeEqual(a, b)) throw new HttpError(401, 'invalid token');
}
