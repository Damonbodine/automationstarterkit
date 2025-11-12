import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import { queueAIAgent } from '@/lib/queue/queues';

const MAX_LINKS = parseInt(process.env.LINK_ENRICH_MAX_LINKS || '3', 10);
const MAX_BYTES = 200 * 1024; // 200KB per link cap
const FETCH_TIMEOUT_MS = parseInt(process.env.LINK_FETCH_TIMEOUT_MS || '10000', 10);

export async function POST(req: NextRequest, context: { params: Promise<{ emailId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { emailId } = await context.params;
  const supabase = getSupabaseServerClient();

  // Verify email belongs to user
  const { data: email } = await supabase
    .from('email_messages')
    .select('id, body_plain, body_html, user_id')
    .eq('id', emailId)
    .eq('user_id', userId)
    .single();
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

  const payload = await req.json().catch(() => ({}));
  let links: string[] = Array.isArray(payload?.links) ? payload.links : [];

  // If no links provided, extract from email body
  if (!links.length) {
    const body = (email.body_plain || email.body_html || '') as string;
    const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;
    links = Array.from(new Set((body.match(urlRegex) || [])));
  }

  links = links.slice(0, MAX_LINKS);
  if (!links.length) return NextResponse.json({ enriched: false, reason: 'No links' });

  const external_texts: Array<{ url: string; type: 'html' | 'json' | 'text'; content: string }> = [];

  for (const url of links) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'StarterPackBot/1.0 (+https://example.com)'
        },
      });
      clearTimeout(timer);

      const ctype = res.headers.get('content-type') || '';
      if (!res.ok) continue;

      if (ctype.includes('application/json')) {
        const json = await res.json().catch(() => null);
        if (json) {
          const str = JSON.stringify(json).slice(0, MAX_BYTES);
          external_texts.push({ url, type: 'json', content: str });
        }
        continue;
      }

      if (ctype.includes('text/html') || ctype.startsWith('text/')) {
        const reader = res.body?.getReader();
        if (!reader) continue;
        let received = 0;
        let chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            received += value.byteLength;
            if (received > MAX_BYTES) {
              chunks.push(value.subarray(0, Math.max(0, MAX_BYTES - (received - value.byteLength))));
              break;
            }
            chunks.push(value);
          }
        }
        const text = Buffer.concat(chunks).toString('utf-8');
        // Naive HTML strip for brevity
        const cleaned = ctype.includes('html') ? text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ') : text;
        external_texts.push({ url, type: ctype.includes('html') ? 'html' : 'text', content: cleaned });
      }
    } catch (e) {
      // ignore errors per link
    }
  }

  if (!external_texts.length) {
    return NextResponse.json({ enriched: false, reason: 'No fetchable content' });
  }

  // Persist as an agent log (no new table needed)
  // @ts-ignore
  await supabase.from('agent_logs').insert({
    user_id: userId,
    email_id: emailId,
    agent_type: 'link-fetch',
    action: 'fetch_links',
    input_data: { links },
    output_data: { external_texts },
    success: true,
  });

  // Re-run summarizer to include external content
  await queueAIAgent('document-summarizer', emailId, userId);

  return NextResponse.json({ enriched: true, links: external_texts.map(e => e.url) });
}

