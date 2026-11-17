import { handleApi } from './api.js';
import { handleMcp } from './mcp.js';
import { verifyAccess, verifyMcpToken } from './auth.js';
import { HttpError } from './db.js';

// One code base, two Workers (WORKER_ROLE):
// - "app" (wrangler.jsonc): interface + /api/*, behind Cloudflare Access.
//   Static files (public/) are served by the assets binding before this handler runs.
// - "mcp" (wrangler.mcp.jsonc): /mcp only, outside Access, protected by MCP_TOKEN.
// Access on *.workers.dev covers a whole hostname, hence the separate MCP Worker.
export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    try {
      if (env.WORKER_ROLE === 'mcp') {
        if (pathname !== '/mcp') throw new HttpError(404, 'not found');
        await verifyMcpToken(request, env);
        return await handleMcp(request, env, ctx);
      }
      if (pathname.startsWith('/api/')) {
        const actor = await verifyAccess(request, env);
        return await handleApi(request, env, ctx, actor);
      }
      throw new HttpError(404, 'not found');
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: 'internal error' }, { status: 500 });
    }
  },
};
