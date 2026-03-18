import { useContext } from "react";
import TranslationContext from "./translationContext";

export const useTranslation = () => useContext(TranslationContext);
