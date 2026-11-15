import { FormsModule } from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgFieldComponent } from './tg-field.component';
import { TgInputDirective } from './tg-input.directive';
import { TgPasswordToggleComponent } from './tg-password-toggle.component';

type Args = TgFieldComponent & { placeholder: string; value: string; disabled: boolean };

const meta: Meta<Args> = {
  title: 'Componentes/Campo de texto',
  component: TgFieldComponent,
  decorators: [
    moduleMetadata({
      imports: [TgInputDirective, TgPasswordToggleComponent, TgButtonComponent, FormsModule, NgxMaskDirective],
      providers: [provideNgxMask()],
    }),
  ],
  parameters: { layout: 'padded' },
  args: {
    label: 'E-mail',
    hint: 'Usamos para enviar o recibo.',
    error: '',
    optional: false,
    variant: 'default',
    placeholder: 'nome@email.com',
    value: '',
    disabled: false,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'search'] },
  },
  render: (args) => ({
    props: args,
    template: `<div style="max-width:360px">
      <tg-field [label]="label" [hint]="hint" [error]="error" [optional]="optional" [variant]="variant">
        <input tgInput type="email" autocomplete="email" [placeholder]="placeholder" [value]="value" [disabled]="disabled" />
      </tg-field>
    </div>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

/** Use os controles para ver dica, erro, opcional e busca. */
export const Playground: Story = {};

/**
 * Estados nos dois modos (troque o modo na barra). Passe o mouse e use Tab
 * para ver hover e foco.
 */
export const Estados: Story = {
  render: () => ({
    template: `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,260px));gap:24px 32px;align-items:start">
      <tg-field label="Vazio"><input tgInput type="email" placeholder="nome@email.com" /></tg-field>
      <tg-field label="Preenchido"><input tgInput type="email" value="ana@email.com" /></tg-field>
      <tg-field label="Com dica" hint="Usamos para enviar o recibo."><input tgInput type="email" value="ana@email.com" /></tg-field>
      <tg-field label="Erro" error="Informe um e-mail válido, como nome@email.com."><input tgInput type="email" value="ana@email" /></tg-field>
      <tg-field label="Desabilitado"><input tgInput type="email" value="ana@email.com" disabled /></tg-field>
      <tg-field label="Somente leitura"><input tgInput type="email" value="ana@email.com" readonly /></tg-field>
    </div>`,
  }),
};

/** Senha, máscara, prefixo, busca, opcional e texto longo. */
export const Variantes: Story = {
  render: () => ({
    template: `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,300px));gap:28px 32px;align-items:start">
      <tg-field label="Senha" hint="Mínimo de 8 caracteres.">
        <input tgInput type="password" autocomplete="new-password" value="segredo123" />
        <tg-password-toggle tgSuffix />
      </tg-field>
      <tg-field label="Telefone" hint="Com DDD.">
        <input tgInput type="tel" inputmode="tel" autocomplete="tel" mask="(00) 0 0000-0000" [(ngModel)]="phone" />
      </tg-field>
      <tg-field label="Valor da hora">
        <span tgPrefix>R$</span>
        <input tgInput inputmode="decimal" value="60,00" />
      </tg-field>
      <tg-field label="Buscar serviço" variant="search">
        <input tgInput type="search" placeholder="Do que você precisa?" />
      </tg-field>
      <tg-field label="Complemento" optional>
        <input tgInput placeholder="Apto, bloco, referência" />
      </tg-field>
      <tg-field label="Descreva o serviço" hint="Até 500 caracteres.">
        <textarea tgInput rows="3" maxlength="500" placeholder="Ex.: trocar 3 tomadas na cozinha"></textarea>
      </tg-field>
    </div>`,
    props: { phone: '11987654321' },
  }),
};

/** Formulário real: o erro aparece depois que a pessoa sai do campo. */
export const Formulario: Story = {
  name: 'Formulário',
  render: () => ({
    template: `<form #form="ngForm" style="max-width:360px;display:flex;flex-direction:column;gap:20px" (ngSubmit)="0">
      <tg-field label="E-mail" [error]="email.touched && email.invalid ? 'Informe um e-mail válido, como nome@email.com.' : ''">
        <input tgInput type="email" name="email" autocomplete="email" required email [(ngModel)]="payload.email" #email="ngModel" />
      </tg-field>
      <tg-field label="Senha" [error]="senha.touched && senha.invalid ? 'Informe sua senha.' : ''">
        <input tgInput type="password" name="senha" autocomplete="current-password" required [(ngModel)]="payload.senha" #senha="ngModel" />
        <tg-password-toggle tgSuffix />
      </tg-field>
      <button tgButton type="submit" size="lg" [fullWidth]="true">Entrar</button>
    </form>`,
    props: { payload: { email: '', senha: '' } },
  }),
};
