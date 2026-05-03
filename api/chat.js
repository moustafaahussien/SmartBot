export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'غير مسموح بهذه الطريقة' });
  }

  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key غير موجود' });
  }

  // ⏱️ helper للانتظار
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // 🔁 retry logic
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          ...req.body,
          // ⛔ safety limits
          max_tokens: Math.min(req.body.max_tokens || 300, 500)
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      // ✅ لو تمام
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json(data);
      }

      // ⚠️ rate limit
      if (response.status === 429) {
        const retryAfter =
          parseInt(response.headers.get('retry-after')) || (2 + attempt * 2);

        console.warn(`429 - إعادة المحاولة بعد ${retryAfter}s`);

        await wait(retryAfter * 1000);
        continue;
      }

      // ❌ أخطاء أخرى من Anthropic
      const errData = await response.json().catch(() => ({}));

      return res.status(response.status).json({
        error: errData.error?.message || 'خطأ من Claude API'
      });

    } catch (err) {
      // ❌ timeout أو network
      if (err.name === 'AbortError') {
        console.warn('Timeout... إعادة المحاولة');
        continue;
      }

      console.error(err);

      return res.status(500).json({
        error: 'فشل الاتصال بخادم الذكاء الاصطناعي'
      });
    }
  }

  // 💥 لو فشل بعد retries
  return res.status(429).json({
    error: 'تم تجاوز الحد المسموح. حاول بعد قليل.'
  });
}
