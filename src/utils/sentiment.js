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

const KO_POSITIVE = [
  '급등', '상승', '흑자', '호실적', '호조', '성장', '상향', '증가', '신고가',
  '돌파', '수주', '반등', '회복', '개선', '확대', '강세', '역대최대', '최대',
  '호황', '기대', '긍정', '선방', '견조', '상회', '어닝서프라이즈',
]
const KO_NEGATIVE = [
  '급락', '하락', '손실', '적자', '부진', '우려', '위기', '하향', '감소',
  '폭락', '추락', '악화', '침체', '둔화', '약세', '충격', '실망', '하회',
  '경고', '불안', '리스크', '손실', '매도', '이탈', '불황', '둔화', '쇼크',
]

function analyzeSentimentKo(text) {
  let pos = 0
  let neg = 0
  for (const w of KO_POSITIVE) if (text.includes(w)) pos++
  for (const w of KO_NEGATIVE) if (text.includes(w)) neg++
  if (pos === 0 && neg === 0) return null
  if (pos === neg) return null
  const label = pos > neg ? 'positive' : 'negative'
  const score = 0.80 + Math.min((Math.abs(pos - neg) - 1) * 0.05, 0.15)
  return { label, score }
}

export async function analyzeSentiment(text, { lang = 'en' } = {}) {
  try {
    if (lang === 'ko') return analyzeSentimentKo(text)
    return await analyzeSentimentEn(text)
  } catch {
    return null
  }
}
