let _finbertPipe = null

async function getFinbertPipeline() {
  if (!_finbertPipe) {
    const { pipeline } = await import('@huggingface/transformers')
    _finbertPipe = await pipeline('sentiment-analysis', 'Xenova/finbert')
  }
  return _finbertPipe
}

async function analyzeSentimentEn(text) {
  const pipe = await getFinbertPipeline()
  const [result] = await pipe(text, { truncation: true, max_length: 128 })
  return result // { label: 'positive'|'negative'|'neutral', score }
}

async function analyzeSentimentKo(text) {
  const token = import.meta.env.VITE_HF_TOKEN
  if (!token) return null

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      'https://api-inference.huggingface.co/models/snunlp/KR-FinBert-SC',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      },
    )
    if (res.status === 503) {
      // 모델 cold start — 잠시 후 재시도
      await new Promise(r => setTimeout(r, 4000))
      continue
    }
    if (!res.ok) return null
    const data = await res.json()
    const scores = Array.isArray(data[0]) ? data[0] : data
    if (!Array.isArray(scores)) return null
    return scores.reduce((best, cur) => (cur.score > best.score ? cur : best))
  }
  return null
}

export async function analyzeSentiment(text, { lang = 'en' } = {}) {
  try {
    return lang === 'ko'
      ? await analyzeSentimentKo(text)
      : await analyzeSentimentEn(text)
  } catch {
    return null
  }
}
