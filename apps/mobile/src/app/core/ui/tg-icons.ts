import { TG_ICONS, type TgIconName, type TgIconWeight } from '@taskgo/icons';
import { addIcons } from 'ionicons';

/**
 * Ícones Phosphor do design system como ícones do Ionic.
 *
 * Cada ícone vira `tg-<nome>` (traço regular) e `tg-<nome>-fill` (preenchido),
 * para usar em `<ion-icon name="tg-receipt" />`. O SVG pinta com currentColor,
 * então a cor vem do CSS do ion-icon.
 */
export function tgIconUrl(name: TgIconName, weight: TgIconWeight = 'regular'): string {
  const paths = TG_ICONS[name][weight];
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">${paths}</svg>`;
}

export function tgIconId(name: TgIconName, weight: TgIconWeight = 'regular'): string {
  return weight === 'fill' ? `tg-${name}-fill` : `tg-${name}`;
}

let registered = false;

/** Registra todos os ícones do DS no Ionic. Pode ser chamada mais de uma vez. */
export function registerTgIcons(): void {
  if (registered) return;
  const icons: Record<string, string> = {};
  for (const name of Object.keys(TG_ICONS) as TgIconName[]) {
    icons[tgIconId(name)] = tgIconUrl(name);
    icons[tgIconId(name, 'fill')] = tgIconUrl(name, 'fill');
  }
  addIcons(icons);
  registered = true;
}
