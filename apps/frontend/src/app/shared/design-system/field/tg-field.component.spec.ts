import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { accessibleName, idRefs } from '../button/accessible-name';
import { TgFieldComponent } from './tg-field.component';
import { TgInputDirective } from './tg-input.directive';
import { TgPasswordToggleComponent } from './tg-password-toggle.component';

@Component({
  imports: [TgFieldComponent, TgInputDirective, TgPasswordToggleComponent, FormsModule, ReactiveFormsModule],
  template: `
    <span id="externa">Usado só no recibo</span>
    <tg-field id="f-email" label="E-mail" [hint]="hint()" [error]="error()">
      <input tgInput type="email" name="email" autocomplete="email" [(ngModel)]="email" />
    </tg-field>

    <tg-field id="f-proprio" label="CEP">
      <input tgInput id="cep" aria-describedby="externa" [formControl]="cep" />
    </tg-field>

    <tg-field id="f-opcional" label="Complemento" optional>
      <input tgInput [disabled]="disabled()" />
    </tg-field>

    <tg-field id="f-senha" label="Senha">
      <input tgInput type="password" autocomplete="current-password" />
      <tg-password-toggle tgSuffix />
    </tg-field>

    <tg-field id="f-busca" label="Buscar serviço" variant="search">
      <input tgInput type="search" placeholder="Do que você precisa?" />
    </tg-field>

    <tg-field id="f-texto" label="Descreva o serviço">
      <textarea tgInput rows="3"></textarea>
    </tg-field>
  `,
})
class HostComponent {
  readonly hint = signal('Usamos para enviar o recibo.');
  readonly error = signal('');
  readonly disabled = signal(false);
  email = '';
  readonly cep = new FormControl('', Validators.required);
}

describe('TgFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const field = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const input = (id: string) => field(id).querySelector('.tg-input') as HTMLInputElement;
  const description = (el: HTMLElement) =>
    idRefs(el.getAttribute('aria-describedby'))
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .join(' ');

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  describe('rótulo, dica e erro', () => {
    it('o rótulo dá nome ao input pelo label for', () => {
      const el = input('f-email');
      expect(field('f-email').querySelector('label')?.getAttribute('for')).toBe(el.id);
      expect(accessibleName(el)).toBe('E-mail');
      expect(el.hasAttribute('aria-label')).toBeFalse();
    });

    it('cada campo tem um id próprio', () => {
      const ids = Array.from(fixture.nativeElement.querySelectorAll('.tg-input'), (el: Element) => el.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('a dica vira a descrição do input', () => {
      const el = input('f-email');
      expect(description(el)).toBe('Usamos para enviar o recibo.');
      expect(el.hasAttribute('aria-invalid')).toBeFalse();
    });

    it('com erro: mensagem com ícone, aria-invalid e descrição trocada', () => {
      host.error.set('Informe um e-mail válido, como nome@email.com.');
      fixture.detectChanges();
      const el = input('f-email');

      expect(field('f-email').classList).toContain('tg-field--invalid');
      expect(el.getAttribute('aria-invalid')).toBe('true');
      expect(description(el)).toBe('Informe um e-mail válido, como nome@email.com.');
      expect(field('f-email').querySelector('.tg-field__error tg-icon svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(field('f-email').querySelector('[aria-live="polite"]')?.textContent).toContain('Informe um e-mail válido');
    });

    it('erro só com espaços não conta como erro', () => {
      host.error.set('   ');
      fixture.detectChanges();
      expect(input('f-email').hasAttribute('aria-invalid')).toBeFalse();
    });

    it('sem dica e sem erro: sem aria-describedby', () => {
      host.hint.set('');
      fixture.detectChanges();
      expect(input('f-email').hasAttribute('aria-describedby')).toBeFalse();
    });

    it('mantém o id e o aria-describedby que a tela pôs', () => {
      const el = input('f-proprio');
      expect(el.id).toBe('cep');
      expect(field('f-proprio').querySelector('label')?.getAttribute('for')).toBe('cep');
      expect(idRefs(el.getAttribute('aria-describedby'))).toEqual(['externa']);
    });
  });

  describe('formulários', () => {
    it('ngModel continua no input nativo', async () => {
      const el = input('f-email');
      el.value = 'ana@email.com';
      el.dispatchEvent(new Event('input'));
      expect(host.email).toBe('ana@email.com');

      host.email = 'bia@email.com';
      fixture.detectChanges();
      await fixture.whenStable();
      expect(el.value).toBe('bia@email.com');
    });

    it('formControl continua no input nativo', () => {
      const el = input('f-proprio');
      el.value = '01001-000';
      el.dispatchEvent(new Event('input'));
      expect(host.cep.value).toBe('01001-000');
      expect(host.cep.valid).toBeTrue();
    });
  });

  it('opcional aparece no rótulo, inclusive no nome', () => {
    expect(field('f-opcional').querySelector('.tg-field__optional')?.textContent).toBe('(opcional)');
    expect(accessibleName(input('f-opcional'))).toBe('Complemento (opcional)');
  });

  it('desabilitado fica legível: sem opacidade', async () => {
    host.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const control = field('f-opcional').querySelector('.tg-field__control') as HTMLElement;
    expect(input('f-opcional').disabled).toBeTrue();
    expect(getComputedStyle(control).opacity).toBe('1');
    expect(getComputedStyle(field('f-opcional')).opacity).toBe('1');
  });

  describe('senha', () => {
    it('mostra e oculta, com nome estável e aria-pressed', () => {
      const el = input('f-senha');
      const toggle = field('f-senha').querySelector('button') as HTMLButtonElement;
      expect(toggle.type).toBe('button');
      expect(accessibleName(toggle)).toBe('Mostrar senha');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      expect(toggle.getAttribute('aria-controls')).toBe(el.id);

      toggle.click();
      fixture.detectChanges();
      expect(el.type).toBe('text');
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      expect(accessibleName(toggle)).toBe('Mostrar senha');

      toggle.click();
      fixture.detectChanges();
      expect(el.type).toBe('password');
    });

    it('não envia o formulário', () => {
      const toggle = field('f-senha').querySelector('button') as HTMLButtonElement;
      const form = document.createElement('form');
      const submit = jasmine.createSpy('submit').and.callFake((e: Event) => e.preventDefault());
      form.addEventListener('submit', submit);
      toggle.parentElement?.insertBefore(form, toggle);
      form.appendChild(toggle);
      toggle.click();
      expect(submit).not.toHaveBeenCalled();
    });
  });

  it('busca: rótulo só para leitor de tela, lupa decorativa', () => {
    const el = input('f-busca');
    const label = field('f-busca').querySelector('label') as HTMLElement;
    expect(label.classList).toContain('tg-field__sr');
    expect(accessibleName(el)).toBe('Buscar serviço');
    expect(field('f-busca').querySelector('.tg-field__control svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('textarea também é ligado ao rótulo', () => {
    const el = field('f-texto').querySelector('textarea') as HTMLTextAreaElement;
    expect(el.classList).toContain('tg-input');
    expect(accessibleName(el)).toBe('Descreva o serviço');
  });

  it('input de 16 px (evita zoom no iOS) e borda de controle', () => {
    expect(getComputedStyle(input('f-email')).fontSize).toBe('16px');
    const control = field('f-email').querySelector('.tg-field__control') as HTMLElement;
    // 1,5 px no CSS; em tela 1x o Chrome arredonda para 1 px.
    expect(parseFloat(getComputedStyle(control).borderTopWidth)).toBeGreaterThanOrEqual(1);
    expect(getComputedStyle(control).borderTopStyle).toBe('solid');
  });
});
