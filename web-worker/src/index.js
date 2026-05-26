export default {
  async fetch(request, env) {
    // Cloudflare Workers Static Assets binding (see wrangler.toml).
    return env.ASSETS.fetch(request);
  },
};

