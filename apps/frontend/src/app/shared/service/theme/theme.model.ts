export interface ThemeColors {
  color: string;
  rgb: string;
  contrast: string;
  contrastRgb: string;
  shade: string;
  tint: string;
}

export class ProviderTheme implements ThemeColors {
  color = '#7353C0';
  rgb = '115, 83, 192';
  contrast = '#ffffff';
  contrastRgb = '255, 255, 255';
  shade = '#6549a9';
  tint = '#8164c6';
}

export class CustomerTheme implements ThemeColors {
  color = '#2563EB';
  rgb = '37, 99, 235';
  contrast = '#ffffff';
  contrastRgb = '255, 255, 255';
  shade = '#1D4ED8';
  tint = '#3B82F6';
}
