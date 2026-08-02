export interface ThemeColorOption {
  name: string;
  value: string;
}

export const KHATMAH_THEME_COLORS: ThemeColorOption[] = [
  { name: 'أخضر', value: '#0a3327' },
  { name: 'زمردي', value: '#0f6b4c' },
  { name: 'ذهبي', value: '#a8791f' },
  { name: 'كحلي', value: '#173a63' },
  { name: 'عنابي', value: '#7a2436' },
  { name: 'بنفسجي', value: '#4a2f6b' },
];

export const DEFAULT_KHATMAH_THEME_COLOR = KHATMAH_THEME_COLORS[0].value;
