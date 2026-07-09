import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function NotFoundPage() {
  const { t } = useTranslation()
  usePageMeta({ title: '페이지를 찾을 수 없습니다 — Ledger' })
  return (
    <div className="not-found-page">
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <Link to="/">{t('notFound.goHome')}</Link>
    </div>
  )
}
