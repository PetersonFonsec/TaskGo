import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { idRefs } from '../button/accessible-name';
import { TgFieldComponent } from './tg-field.component';
import { TgInputDirective } from './tg-input.directive';
import { TgPasswordToggleComponent } from './tg-password-toggle.component';

// A tela e o campo dividem aria-describedby e aria-invalid do input.
@Component({
  imports: [TgFieldComponent, TgInputDirective, ReactiveFormsModule],
  template: `
    <span id="ext-1">Usado só no recibo</span>
    <span id="ext-2">Pode ser o do trabalho</span>
    <tg-field id="dinamico" label="E-mail" [hint]="hint()" [error]="error()">
      <input
        tgInput
        type="email"
        [formControl]="email"
        [attr.aria-describedby]="ids()"
        [attr.aria-invalid]="invalid()"
      />
    </tg-field>
    <tg-field id="estatico" label="CEP" hint="Só números." [error]="error()">
      <input tgInput aria-describedby="ext-1" aria-invalid="false" />
    </tg-field>
    @if (show()) {
      <tg-field id="destruivel" label="Nome" [hint]="hint()">
        <input tgInput />
      </tg-field>
    }
  `,
})
class SharedStateHostComponent {
  readonly hint = signal('Usamos para enviar o recibo.');
  readonly error = signal('');
  readonly ids = signal<string | null>(null);
  readonly invalid = signal<boolean | 'true' | 'false' | null>(null);
  readonly show = signal(true);
  readonly email = new FormControl('', Validators.email);
}

describe('TgInputDirective: atributos divididos com a tela', () => {
  let fixture: ComponentFixture<SharedStateHostComponent>;
  let host: SharedStateHostComponent;
  let el: HTMLInputElement;
  let fixed: HTMLInputElement;

  // A tela escreve por binding; o campo acompanha (MutationObserver é uma
  // microtarefa), então cada passo espera o DOM assentar.
  const render = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };
  const describedBy = (input: HTMLElement) => idRefs(input.getAttribute('aria-describedby'));
  const hintId = (id: string) => fixture.nativeElement.querySelector(`#${id} .tg-field__hint`)?.id as string;
  const errorId = (id: string) => fixture.nativeElement.querySelector(`#${id} .tg-field__error`)?.id as string;

  beforeEach(async () => {
    fixture = TestBed.createComponent(SharedStateHostComponent);
    host = fixture.componentInstance;
    await render();
    el = fixture.nativeElement.querySelector('#dinamico input');
    fixed = fixture.nativeElement.querySelector('#estatico input');
  });

  describe('aria-describedby', () => {
    it('estático da tela fica antes da dica, e a dica sai no erro', async () => {
      expect(describedBy(fixed)).toEqual(['ext-1', hintId('estatico')]);
      host.error.set('Informe um CEP válido.');
      await render();
      expect(describedBy(fixed)).toEqual(['ext-1', errorId('estatico')]);
      host.error.set('');
      await render();
      expect(describedBy(fixed)).toEqual(['ext-1', hintId('estatico')]);
    });

    it('dinâmico: incluído depois, alterado e removido', async () => {
      expect(describedBy(el)).toEqual([hintId('dinamico')]);

      host.ids.set('ext-1');
      await render();
      expect(describedBy(el)).toEqual(['ext-1', hintId('dinamico')]);

      host.ids.set('ext-1 ext-2');
      await render();
      expect(describedBy(el)).toEqual(['ext-1', 'ext-2', hintId('dinamico')]);

      host.ids.set('ext-2');
      await render();
      expect(describedBy(el)).toEqual(['ext-2', hintId('dinamico')]);

      host.ids.set(null);
      await render();
      expect(describedBy(el)).toEqual([hintId('dinamico')]);
    });

    it('troca entre dica e erro mantém a descrição da tela', async () => {
      host.ids.set('ext-1');
      await render();

      host.error.set('Informe um e-mail válido.');
      await render();
      expect(describedBy(el)).toEqual(['ext-1', errorId('dinamico')]);

      host.error.set('');
      await render();
      expect(describedBy(el)).toEqual(['ext-1', hintId('dinamico')]);

      host.hint.set('');
      await render();
      expect(el.getAttribute('aria-describedby')).toBe('ext-1');
    });

    it('sem ids repetidos, mesmo se a tela repetir ou citar o id do campo', async () => {
      host.ids.set(`ext-1 ext-1 ${hintId('dinamico')}`);
      await render();
      const ids = describedBy(el);
      expect(ids).toEqual(['ext-1', hintId('dinamico')]);
    });

    it('tela e campo mudam no mesmo ciclo', async () => {
      host.ids.set('ext-2');
      host.error.set('Informe um e-mail válido.');
      await render();
      expect(describedBy(el)).toEqual(['ext-2', errorId('dinamico')]);

      host.ids.set(null);
      host.error.set('');
      await render();
      expect(describedBy(el)).toEqual([hintId('dinamico')]);
    });

    it('mudança direta no DOM pela tela também vale', async () => {
      el.setAttribute('aria-describedby', 'ext-2');
      await render();
      expect(describedBy(el)).toEqual(['ext-2', hintId('dinamico')]);
    });
  });

  describe('aria-invalid', () => {
    it('sem erro e sem estado da tela: ausente', () => {
      expect(el.hasAttribute('aria-invalid')).toBeFalse();
    });

    for (const value of [true, 'true', false, 'false'] as const) {
      it(`a tela põe ${JSON.stringify(value)}: fica com o valor da tela`, async () => {
        host.invalid.set(value);
        await render();
        expect(el.getAttribute('aria-invalid')).toBe(String(value));
      });
    }

    it('estático da tela é mantido sem erro', () => {
      expect(fixed.getAttribute('aria-invalid')).toBe('false');
    });

    it('erro do campo vence; ao sair, volta o valor da tela', async () => {
      host.invalid.set(false);
      await render();
      host.error.set('Informe um e-mail válido.');
      await render();
      expect(el.getAttribute('aria-invalid')).toBe('true');
      expect(fixed.getAttribute('aria-invalid')).toBe('true');

      host.error.set('');
      await render();
      expect(el.getAttribute('aria-invalid')).toBe('false');
      expect(fixed.getAttribute('aria-invalid')).toBe('false');
    });

    it('tela muda durante o erro: vale o valor mais recente depois', async () => {
      host.error.set('Informe um e-mail válido.');
      await render();
      host.invalid.set(true);
      await render();
      host.invalid.set(null);
      await render();
      expect(el.getAttribute('aria-invalid')).toBe('true'); // erro ainda visível

      host.error.set('');
      await render();
      expect(el.hasAttribute('aria-invalid')).toBeFalse();
    });

    it('tela e campo mudam no mesmo ciclo', async () => {
      host.error.set('Informe um e-mail válido.');
      await render();
      host.error.set('');
      host.invalid.set('true');
      await render();
      expect(el.getAttribute('aria-invalid')).toBe('true');
    });

    it('não mexe no FormControl', async () => {
      host.email.setValue('ana');
      host.error.set('Informe um e-mail válido.');
      await render();
      host.error.set('');
      await render();
      expect(host.email.invalid).toBeTrue();
      expect(host.email.errors).toEqual({ email: true });
    });
  });

  it('destruído: para de acompanhar o input', async () => {
    const input = fixture.nativeElement.querySelector('#destruivel input') as HTMLInputElement;
    host.show.set(false);
    await render();
    input.setAttribute('aria-describedby', 'ext-1');
    await new Promise((resolve) => setTimeout(resolve));
    expect(input.getAttribute('aria-describedby')).toBe('ext-1');
  });
});

@Component({
  imports: [TgFieldComponent, TgInputDirective, TgPasswordToggleComponent, ReactiveFormsModule],
  template: `
    <form (submit)="submits = submits + 1; $event.preventDefault()">
      <tg-field id="senha" label="Senha">
        <input tgInput type="password" [formControl]="password" />
        <tg-password-toggle tgSuffix />
      </tg-field>
      <tg-field id="desde-o-inicio" label="Senha antiga">
        <input tgInput type="password" disabled />
        <tg-password-toggle tgSuffix />
      </tg-field>
      <tg-field id="texto" label="Apelido">
        <input tgInput type="text" />
        <tg-password-toggle tgSuffix />
      </tg-field>
      <tg-field id="sem-input" label="Sem campo">
        <tg-password-toggle tgSuffix />
      </tg-field>
    </form>
    <tg-password-toggle id="fora" />
  `,
})
class PasswordHostComponent {
  readonly password = new FormControl('segredo123');
  submits = 0;
}

describe('TgPasswordToggleComponent: estado do campo', () => {
  let fixture: ComponentFixture<PasswordHostComponent>;
  let host: PasswordHostComponent;

  const render = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };
  const toggleIn = (id: string) => fixture.nativeElement.querySelector(`#${id} button`) as HTMLButtonElement;
  const inputIn = (id: string) => fixture.nativeElement.querySelector(`#${id} input`) as HTMLInputElement;
  const press = async (id: string) => {
    toggleIn(id).click();
    await render();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(PasswordHostComponent);
    host = fixture.componentInstance;
    await render();
  });

  it('começa oculta; um clique mostra, outro oculta; aria-pressed acompanha', async () => {
    const button = toggleIn('senha');
    const input = inputIn('senha');
    expect(input.type).toBe('password');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    await press('senha');
    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    await press('senha');
    expect(input.type).toBe('password');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Mostrar senha');
    expect(button.getAttribute('aria-controls')).toBe(input.id);
    expect(button.type).toBe('button');
  });

  it('campo desabilitado desde o início: botão indisponível, senha oculta', async () => {
    const button = toggleIn('desde-o-inicio');
    expect(button.disabled).toBeTrue();
    button.click();
    await render();
    expect(inputIn('desde-o-inicio').type).toBe('password');
  });

  it('desabilitado depois: oculta a senha e trava; habilitado de novo: volta a funcionar', async () => {
    await press('senha');
    expect(inputIn('senha').type).toBe('text');

    host.password.disable();
    await render();
    expect(toggleIn('senha').disabled).toBeTrue();
    expect(inputIn('senha').type).toBe('password');
    expect(toggleIn('senha').getAttribute('aria-pressed')).toBe('false');

    host.password.enable();
    await render();
    expect(toggleIn('senha').disabled).toBeFalse();
    await press('senha');
    expect(inputIn('senha').type).toBe('text');
  });

  it('campo que não é de senha: botão indisponível e o tipo não muda', async () => {
    expect(toggleIn('texto').disabled).toBeTrue();
    toggleIn('texto').click();
    await render();
    expect(inputIn('texto').type).toBe('text');
  });

  it('sem input ou fora de um tg-field: botão indisponível', () => {
    expect(toggleIn('sem-input').disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#fora button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('tipo trocado pela tela: aria-pressed segue o tipo real', async () => {
    inputIn('senha').type = 'text';
    inputIn('senha').setAttribute('type', 'text');
    await render();
    expect(toggleIn('senha').getAttribute('aria-pressed')).toBe('true');
  });

  it('não envia o formulário', async () => {
    await press('senha');
    expect(host.submits).toBe(0);
  });

  it('teclado: o botão continua no Tab quando o campo está disponível', () => {
    const button = toggleIn('senha');
    expect(button.tabIndex).toBe(0);
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
