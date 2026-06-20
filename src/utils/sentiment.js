let _pipe = null

async function getPipeline() {
  if (!_pipe) {
    const { pipeline } = await import('@huggingface/transformers')
    _pipe = await pipeline(
      'sentiment-analysis',
      'Xenova/finbert',
    )
  }
  return _pipe
}

export async function analyzeSentiment(text) {
  try {
    const pipe = await getPipeline()
    const [result] = await pipe(text, { truncation: true, max_length: 128 })
    return result // { label: 'POSITIVE' | 'NEGATIVE', score: 0~1 }
  } catch {
    return null
  }
}
