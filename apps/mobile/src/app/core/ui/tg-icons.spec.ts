import { TG_ICONS } from '@taskgo/icons';

import { registerTgIcons, tgIconId, tgIconUrl } from './tg-icons';

describe('tg-icons', () => {
  it('monta um SVG em data URL que o Ionic lê direto, pintado com currentColor', () => {
    const url = tgIconUrl('receipt');

    expect(url.startsWith('data:image/svg+xml;utf8,<svg')).toBeTrue();
    expect(url).toContain('viewBox="0 0 256 256"');
    expect(url).toContain('fill="currentColor"');
    expect(url).toContain(TG_ICONS.receipt.regular);
  });

  it('usa o desenho preenchido quando pedido', () => {
    expect(tgIconUrl('star', 'fill')).toContain(TG_ICONS.star.fill);
    expect(tgIconId('star', 'fill')).toBe('tg-star-fill');
    expect(tgIconId('star')).toBe('tg-star');
  });

  it('registra todos os ícones do DS nos dois pesos', () => {
    registerTgIcons();
    registerTgIcons();

    // O ionicons guarda o mapa de ícones registrados em window.Ionicons.map.
    const map = (window as unknown as { Ionicons: { map: Map<string, string> } }).Ionicons.map;
    for (const name of Object.keys(TG_ICONS) as (keyof typeof TG_ICONS)[]) {
      expect(map.get(`tg-${name}`)).toBe(tgIconUrl(name));
      expect(map.get(`tg-${name}-fill`)).toBe(tgIconUrl(name, 'fill'));
    }
  });
});
