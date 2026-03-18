import { useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { getLanguage, setLanguage, subscribeLanguage } from "./languageStore";
import enCommon from "./locales/en/common.json";
import deCommon from "./locales/de/common.json";
import TranslationContext from "./translationContext";

const resources = { en: enCommon, de: deCommon };

const getNestedValue = (source, key) =>
  String(key || "")
    .split(".")
    .reduce((current, part) => (current && part in current ? current[part] : undefined), source);

const interpolate = (value, vars = {}) =>
  String(value).replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] === undefined || vars[key] === null ? "" : String(vars[key]),
  );

export function TranslationProvider({ children }) {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguage,
    getLanguage,
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo(() => {
    const dictionary = resources[language] || resources.de;
    return {
      language,
      setLanguage,
      t: (key, fallback = "", vars = {}) => {
        const translated = getNestedValue(dictionary, key);
        const resolved = translated === undefined ? fallback || key : translated;
        return typeof resolved === "string" ? interpolate(resolved, vars) : resolved;
      },
    };
  }, [language]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}
