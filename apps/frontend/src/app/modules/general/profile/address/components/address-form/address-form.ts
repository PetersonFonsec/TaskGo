import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Subscription } from 'rxjs';

import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { IAddressEntity } from '@shared/service/address/address.model';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';

/** Campos que a API exige (`CreateAddressDto`), na ordem em que aparecem no formulário. */
export const ADDRESS_FIELDS = ['label', 'cep', 'street', 'number', 'city', 'state'] as const;
export type AddressField = (typeof ADDRESS_FIELDS)[number];
export type AddressErrors = Record<AddressField, string>;

const onlyDigits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');
const blank = (value: string | null | undefined) => !(value ?? '').trim();

/**
 * As regras do `CreateAddressDto` da API (apps/backend/src/modules/address):
 * nome, rua, número, cidade e estado são texto obrigatório (a entidade
 * recusa vazio), e o complemento é opcional. O bairro não está no DTO e a
 * API não o guarda. O CEP tem 8 dígitos, como a busca exige.
 */
export function addressErrors(address: IAddressEntity): AddressErrors {
  const cep = onlyDigits(address.cep);
  return {
    label: blank(address.label) ? 'Dê um nome ao endereço, como Casa ou Trabalho.' : '',
    cep: !cep ? 'Informe o CEP.' : cep.length !== 8 ? 'Informe os 8 dígitos do CEP.' : '',
    street: blank(address.street) ? 'Informe a rua.' : '',
    number: blank(address.number) ? 'Informe o número.' : '',
    city: blank(address.city) ? 'Informe a cidade.' : '',
    state: blank(address.state) ? 'Informe o estado.' : '',
  };
}

const NO_ERRORS: AddressErrors = { label: '', cep: '', street: '', number: '', city: '', state: '' };

/**
 * Formulário de endereço da tela Endereços (Etapa 10). Só os campos: o
 * painel (`tg-sheet`) e o botão de enviar (com `form="<formId>"`) são da
 * tela. Os erros aparecem abaixo de cada campo depois da primeira tentativa
 * de salvar, e o foco vai para o primeiro campo com erro.
 */
@Component({
  selector: 'app-address-form',
  imports: [FormsModule, NgxMaskDirective, TgAlertComponent, TgFieldComponent, TgInputDirective],
  providers: [provideNgxMask()],
  templateUrl: './address-form.html',
  styleUrl: './address-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressForm implements OnInit, OnDestroy {
  private readonly geolocalization = inject(Geolocalization);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private cepRequest?: Subscription;
  private lastCep = '';
  private static nextFormId = 0;

  /** Id do `form`, para o botão de enviar que fica fora dele (no painel). */
  readonly formId = input(`address-form-${AddressForm.nextFormId++}`);
  readonly initialAddress = input<IAddressEntity | null>(null);
  readonly saving = input(false);
  readonly addressSubmit = output<IAddressEntity>();

  readonly lookingUpCep = signal(false);
  readonly cepError = signal('');
  /** Já tentou salvar: a partir daí, os erros aparecem. */
  readonly submitted = signal(false);

  payload: IAddressEntity = {
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    cep: '',
    lat: 0,
    lng: 0,
    isDefault: false,
  };

  ngOnInit() {
    const initial = this.initialAddress();
    if (initial) {
      this.payload = { ...initial, complement: initial.complement ?? '' };
      this.lastCep = onlyDigits(this.payload.cep);
    }
  }

  ngOnDestroy() {
    this.cepRequest?.unsubscribe();
  }

  /** Erros visíveis (só depois de tentar salvar). */
  errors(): AddressErrors {
    return this.submitted() ? addressErrors(this.payload) : NO_ERRORS;
  }

  /**
   * CEP completo e diferente do anterior busca o endereço. O que a pessoa
   * mudou enquanto a busca corria fica; número e complemento nunca mudam.
   * Uma resposta de um CEP anterior é descartada.
   */
  onCepChange(value: string) {
    const cep = onlyDigits(value);
    this.payload.cep = cep;
    if (cep === this.lastCep) return;
    this.lastCep = cep;
    this.cepRequest?.unsubscribe();
    this.lookingUpCep.set(false);
    this.cepError.set('');
    if (cep.length !== 8) return;

    this.payload.lat = 0;
    this.payload.lng = 0;
    const previousAddress = { ...this.payload };
    this.lookingUpCep.set(true);
    this.cepRequest = this.geolocalization.getAddressByCep(cep).subscribe({
      next: (address) => {
        const resolvedAddress = {
          street: address.street ?? '',
          neighborhood: address.neighborhood ?? '',
          city: address.city,
          state: address.state,
          country: 'Brasil',
        };
        for (const field of Object.keys(resolvedAddress) as (keyof typeof resolvedAddress)[]) {
          if (this.payload[field] === previousAddress[field]) {
            this.payload[field] = resolvedAddress[field];
          }
        }
        this.lookingUpCep.set(false);
      },
      error: (error: { status?: number } | null) => {
        this.lookingUpCep.set(false);
        this.cepError.set(
          error?.status === 404
            ? 'CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.'
            : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
        );
      },
    });
  }

  /** Envio do formulário: valida, foca o primeiro erro ou entrega o endereço. */
  submit() {
    this.submitted.set(true);
    const errors = addressErrors(this.payload);
    const first = ADDRESS_FIELDS.find((field) => errors[field]);
    if (first) {
      this.host.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    this.createAddress();
  }

  /** Entrega o endereço com o CEP só em dígitos e o texto sem espaços nas pontas. */
  createAddress() {
    const cep = onlyDigits(this.payload.cep);
    if (this.saving() || this.lookingUpCep() || cep.length !== 8) return;
    const trim = (value: string | null | undefined) => (value ?? '').trim();
    this.addressSubmit.emit({
      ...this.payload,
      label: trim(this.payload.label),
      street: trim(this.payload.street),
      number: trim(this.payload.number),
      complement: trim(this.payload.complement),
      city: trim(this.payload.city),
      state: trim(this.payload.state),
      cep,
      isDefault: !!this.payload.isDefault,
    });
  }
}
