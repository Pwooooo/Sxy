export default async function handler(req, res) {
  return res.status(200).json({
    url: process.env.UPSTASH_REDIS_REST_URL ? 'SET' : 'MISSING',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET' : 'MISSING',
    urlLen: (process.env.UPSTASH_REDIS_REST_URL || '').length,
    tokenLen: (process.env.UPSTASH_REDIS_REST_TOKEN || '').length
  });
}
