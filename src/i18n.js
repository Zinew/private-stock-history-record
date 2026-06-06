import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from './locales/ko.json'
import en from './locales/en.json'

const savedLng = (() => { try { return localStorage.getItem('i18nextLng') } catch { return null } })() ?? 'ko'

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: savedLng,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem('i18nextLng', lng) } catch {}
})

export default i18n
