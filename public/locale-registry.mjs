// UI/report languages are separate from the speech-input contract (zh/en).
export const LANGUAGES=["zh","en","es","fr","ru","ar","hi","ur"];
export const languages={"zh":"简体中文","en":"English","es":"Español","fr":"Français","ru":"Русский","ar":"العربية","hi":"हिन्दी","ur":"اردو"};
export const normalizeLanguage=lang=>LANGUAGES.includes(lang)?lang:'en';
export const direction=lang=>['ar','ur'].includes(lang)?'rtl':'ltr';

export const GLOSSARY_VERSION='0.2.0';
