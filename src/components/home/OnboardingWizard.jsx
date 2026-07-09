import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// 첫 방문자(보유 종목 0개) 온보딩 3단계 wizard
const DISMISS_KEY = 'ledgerWizardDismissed'

export default function OnboardingWizard() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  if (dismissed) return null

  const steps = [1, 2, 3].map(i => ({
    title: t(`wizard.step${i}Title`),
    body: t(`wizard.step${i}Body`),
  }))
  const isLast = step === steps.length - 1

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }
  function start() {
    dismiss()
    document.getElementById('add-holding')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="wizard" role="region" aria-label={t('wizard.step1Title')}>
      <button className="wizard-skip" onClick={dismiss}>{t('wizard.skip')}</button>
      <div className="wizard-dots">
        {steps.map((_, i) => (
          <button
            key={i}
            className={`wizard-dot${i === step ? ' active' : ''}`}
            aria-label={`${i + 1}/${steps.length}`}
            onClick={() => setStep(i)}
          />
        ))}
      </div>
      <h2 className="wizard-title">{steps[step].title}</h2>
      <p className="wizard-body">{steps[step].body}</p>
      <div className="wizard-actions">
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>{t('wizard.back')}</button>}
        {isLast
          ? <button className="btn" onClick={start}>{t('wizard.start')}</button>
          : <button className="btn" onClick={() => setStep(step + 1)}>{t('wizard.next')}</button>}
      </div>
    </div>
  )
}
