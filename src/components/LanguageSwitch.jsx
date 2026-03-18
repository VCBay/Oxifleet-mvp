import { useTranslation } from "../i18n/useTranslation";

function LanguageSwitch() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      aria-label={t("language.switchLabel", "Language")}
      className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
    >
      {["de", "en"].map((code) => {
        const isActive = language === code;
        return (
          <button
            aria-pressed={isActive}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            key={code}
            onClick={() => setLanguage(code)}
            type="button"
          >
            {t(`language.short.${code}`, code.toUpperCase())}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitch;
