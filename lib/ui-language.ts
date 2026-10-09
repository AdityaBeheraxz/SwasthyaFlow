export const uiLanguages=['en','hi','or'] as const;
export type UiLanguage=(typeof uiLanguages)[number];
export function validUiLanguage(value:unknown):UiLanguage{return uiLanguages.includes(value as UiLanguage)?value as UiLanguage:'en';}
