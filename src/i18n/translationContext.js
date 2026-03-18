import { createContext } from "react";

const TranslationContext = createContext({
  language: "de",
  setLanguage: () => {},
  t: (key, fallback = "") => fallback || key,
});

export default TranslationContext;

