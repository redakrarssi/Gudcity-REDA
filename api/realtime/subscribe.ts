import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // SSE headers - compatible with Vercel serverless
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const user = await verifyAuth(req);
  if (!user) {
    res.status(401).end();
    return;
  }

  const send = (event: string, data: any) => {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE event:', error);
      // Connection may have closed
    }
  };

  // Initial event
  send('connected', { ok: true, ts: Date.now(), userId: user.id });

  // Heartbeat every 25 seconds (Vercel timeout is 30s)
  const interval = setInterval(() => {
    send('heartbeat', { ts: Date.now(), userId: user.id });
  }, 25000);

  // Handle connection close
  const cleanup = () => {
    clearInterval(interval);
    send('disconnected', { ts: Date.now(), userId: user.id });
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);

  // Keep connection alive for maximum Vercel timeout (30 seconds)
  setTimeout(() => {
    cleanup();
    res.end();
  }, 30000);
}

