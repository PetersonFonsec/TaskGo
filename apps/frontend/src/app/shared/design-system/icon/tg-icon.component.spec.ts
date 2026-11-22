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
    expect(svg.querySelector('path')?.getAttribute('d')).toContain('M128');
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

  it('escapa o label no atributo', () => {
    const svg = render({ name: 'house', label: 'Casa "nova" <b>' });
    expect(svg.getAttribute('aria-label')).toBe('Casa "nova" <b>');
    expect(svg.querySelector('b')).toBeNull();
  });

  // O _ngcontent-* é o escopo de estilo do próprio Angular, não vem das entradas.
  const atributos = (svg: SVGElement) =>
    svg
      .getAttributeNames()
      .filter((nome) => !nome.startsWith('_ngcontent-'))
      .sort();
  const decorativo = ['aria-hidden', 'fill', 'focusable', 'height', 'viewBox', 'width', 'xmlns'].sort();

  it('fica direto dentro do host, sem outro elemento em volta', () => {
    const fixture = TestBed.createComponent(TgIconComponent);
    fixture.componentRef.setInput('name', 'house');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.children.length).toBe(1);
    expect(host.firstElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('usa 20 de tamanho por padrão', () => {
    const svg = render({ name: 'house' });
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('height')).toBe('20');
  });

  for (const size of [16, 24, 32, 18.5]) {
    it(`mantém o tamanho válido ${size}`, () => {
      const svg = render({ name: 'house', size });
      expect(svg.getAttribute('width')).toBe(String(size));
      expect(svg.getAttribute('height')).toBe(String(size));
    });
  }

  const invalidos: [string, unknown][] = [
    ['0', 0],
    ['negativo', -8],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['texto numérico', '24'],
    ['texto com atributo', '24" onload="alert(1)'],
    ['null', null],
    ['undefined', undefined],
  ];
  for (const [nome, size] of invalidos) {
    it(`cai em 20 com tamanho inválido (${nome}) sem criar atributos a mais`, () => {
      const svg = render({ name: 'house', size });
      expect(svg.getAttribute('width')).toBe('20');
      expect(svg.getAttribute('height')).toBe('20');
      expect(atributos(svg)).toEqual(decorativo);
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
    });
  }

  it('escapa aspas, <, > e & no label sem criar atributos nem elementos', () => {
    const label = `Casa "nova" & <b>velha</b> ' x="1" onclick="y"`;
    const svg = render({ name: 'house', label, size: 'abc' });
    expect(svg.getAttribute('aria-label')).toBe(label);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.hasAttribute('aria-hidden')).toBeFalse();
    expect(svg.querySelector('b')).toBeNull();
    expect(atributos(svg)).toEqual(
      ['aria-label', 'fill', 'focusable', 'height', 'role', 'viewBox', 'width', 'xmlns'].sort(),
    );
  });
});
