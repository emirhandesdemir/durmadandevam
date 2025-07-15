import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { en } from "@/locales/en";
import { tr } from "@/locales/tr";

/**
 * i18next kütüphanesini yapılandırır ve başlatır.
 * Bu dosya, uygulamanın çoklu dil desteği için merkezi yapılandırma noktasıdır.
 */
i18n
  // Tarayıcının dilini otomatik olarak algılayan eklenti.
  .use(LanguageDetector)
  // i18n'i React bileşenleriyle uyumlu hale getiren eklenti.
  .use(initReactI18next)
  .init({
    // Geliştirme ortamında konsola hata ayıklama bilgileri yazdırır.
    debug: process.env.NODE_ENV === 'development',
    // Eğer algılanan dil için bir çeviri bulunamazsa, Türkçe'yi varsayılan dil olarak kullan.
    fallbackLng: "tr",
    interpolation: {
      // React zaten XSS saldırılarına karşı koruma sağladığı için bu ayar kapatılabilir.
      escapeValue: false, 
    },
    // Uygulamada kullanılacak dillerin çeviri kaynakları.
    resources: {
      en: en,
      tr: tr,
    },
  });

export default i18n;
