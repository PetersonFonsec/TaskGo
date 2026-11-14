import { TestBed } from '@angular/core/testing';
import { TgIconComponent } from './tg-icon.component';

describe('TgIconComponent', () => {
  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(TgIconComponent);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg') as SVGElement;
  }

  it('desenha o ícone e é decorativo por padrão', () => {
    const svg = render({ name: 'house' });
    expect(svg.querySelector('path')).not.toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('20');
  });

  it('com label vira imagem com nome acessível', () => {
    const svg = render({ name: 'house', label: 'Início' });
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Início');
    expect(svg.hasAttribute('aria-hidden')).toBeFalse();
  });

  it('usa o desenho preenchido no peso fill', () => {
    const regular = render({ name: 'house' }).innerHTML;
    const fill = render({ name: 'house', weight: 'fill' }).innerHTML;
    expect(fill).not.toEqual(regular);
  });
});
