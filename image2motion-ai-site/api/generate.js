const LANGS = ["English", "Urdu (اردو)", "Roman Urdu", "Hindi (हिन्दी)", "Arabic (العربية)", "Bengali (বাংলা)", "Punjabi (ਪੰਜਾਬੀ)", "Pashto (پښتو)", "Spanish (Español)", "French (Français)", "German (Deutsch)", "Portuguese (Português)", "Italian (Italiano)", "Russian (Русский)", "Turkish (Türkçe)", "Indonesian (Bahasa Indonesia)", "Chinese Simplified (简体中文)", "Japanese (日本語)", "Korean (한국어)"];
const mem = new Map();
async function overLimit(ip) {
  const max = +process.env.DAILY_LIMIT || 5;
  const k = `i2m:${ip}:${new Date().toISOString().slice(0, 10)}`;
  const url = process.env.UPSTASH_REDIS_REST_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && tok) {
    try {
      const r = await fetch(url + '/pipeline', {
        method: 'POST', headers: { Authorization: 'Bearer ' + tok },
        body: JSON.stringify([['INCR', k], ['EXPIRE', k, 86400]])
      });
      const d = await r.json();
      return d[0].result > max;
    } catch (e) { /* fall back to memory */ }
  }
  const n = (mem.get(k) || 0) + 1; mem.set(k, n);
  if (mem.size > 5000) mem.clear();
  return n > max;
}

// Vercel serverless function: POST /api/generate
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const code = process.env.ACCESS_CODE;
  if (code && (req.body || {}).code !== code)
    return res.status(401).json({ error: 'Access code is missing or incorrect.', needCode: true });
  if (!code) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').split(',')[0].trim();
    if (await overLimit(ip))
      return res.status(429).json({ error: 'Daily free limit reached. Please try again tomorrow.' });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set (check your Vercel environment variables).' });

  const b = req.body || {};
  if (!b.image || typeof b.image !== 'string' || b.image.length > 4000000)
    return res.status(400).json({ error: 'Image is missing or too large.' });

  const dur = [5, 10, 15, 30].includes(+b.dur) ? +b.dur : 10;
  const ar = ['16:9', '9:16', '1:1'].includes(b.ar) ? b.ar : '16:9';
    const lang = LANGS.includes(b.lang) ? b.lang : 'English';
  const promptsLang = b.promptsEn === false ? lang : 'English';
  const style = String(b.style || 'Cinematic').slice(0, 40);
  const note = String(b.note || '').slice(0, 300);
  const n = dur <= 5 ? 3 : dur <= 10 ? 4 : dur <= 15 ? 5 : 7;

  const prompt = `You are a video director and AI video prompt engineer. Study the attached image and plan how to animate it into a ${dur}-second ${ar} video in "${style}" style.${note ? ` User's idea: ${note}.` : ''}
Return ONLY JSON, no markdown:
{"summary":"1-2 sentences describing the image","mood":"short mood","tags":["3-5 keywords"],
"motion_prompts":[{"title":"short name","prompt":"ready-to-paste image-to-video prompt, English, 25-45 words, describing subject motion, camera move, lighting, atmosphere"}] (exactly 4, varied),
"scenes":[{"title":"short","idea":"1-2 sentence scene idea"}] (exactly 4),
"storyboard":[{"shot":1,"duration":"2s","visual":"what we see","camera":"camera move","motion":"what moves","voiceover":"short narration or on-screen caption for this shot, max 15 words","prompt":"generation prompt for this shot"}] (exactly ${n} shots, durations sum to ~${dur}s)}
Write summary, mood, scene ideas and storyboard visual/motion/camera descriptions in ${lang}, including titles, tags and the voiceover lines (voiceover should sound natural for a ${lang}-speaking audience). All "prompt" fields (motion_prompts and storyboard) must be written in ${promptsLang}.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 3000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b.image } },
          { type: 'text', text: prompt }
        ] }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: (data.error && data.error.message) || 'AI API error' });
    const text = (data.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(text));
  } catch (e) {
    return res.status(500).json({ error: 'Could not generate the plan. Please try again.' });
  }
};
