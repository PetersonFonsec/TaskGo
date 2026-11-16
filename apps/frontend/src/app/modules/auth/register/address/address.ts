import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Subject, Subscription, catchError, finalize, map, of, startWith, switchMap } from 'rxjs';

import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { focusFirstInvalid, onlyDigits, requiredError } from '../register-validation';

/** idle: sem CEP completo; found: endereço preenchido; notFound: CEP não existe; error: a busca falhou. */
export type CepLookup = 'idle' | 'loading' | 'found' | 'notFound' | 'error';

type AddressField = 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state';

const hasCoordinates = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

/**
 * Passo 3 do cadastro: onde a pessoa está. O CEP preenche o endereço e as
 * coordenadas. Sem coordenadas (CEP não encontrado ou sem posição), a tela
 * pede a localização do aparelho, porque a API exige lat e lng.
 */
@Component({
  selector: 'app-address',
  imports: [FormsModule, NgxMaskDirective, RouterLink, TgAlertComponent, TgButtonComponent, TgFieldComponent, TgIconComponent, TgInputDirective],
  providers: [provideNgxMask()],
  templateUrl: './address.html',
  styleUrl: './address.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Address {
  #geolocalization = inject(Geolocalization);
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);
  #destroyRef = inject(DestroyRef);

  readonly #draft = this.#registerUser.user().address;
  readonly cep = signal(this.#draft.cep);
  readonly street = signal(this.#draft.street);
  readonly number = signal(this.#draft.number);
  readonly complement = signal(this.#draft.complement);
  readonly neighborhood = signal(this.#draft.neighborhood);
  readonly city = signal(this.#draft.city);
  readonly state = signal(this.#draft.state);
  readonly lat = signal(this.#draft.lat);
  readonly lng = signal(this.#draft.lng);

  readonly lookup = signal<CepLookup>(this.#draft.city ? 'found' : 'idle');
  readonly locating = signal(false);
  readonly locationError = signal('');
  readonly submitted = signal(false);

  readonly hasLocation = computed(() => hasCoordinates(this.lat(), this.lng()));
  /** Cidade e UF viram campos só quando o CEP não as trouxe. */
  readonly manualCity = computed(() => this.lookup() === 'notFound' || this.lookup() === 'error' || (this.lookup() === 'found' && !this.city()));
  readonly needsLocation = computed(() => this.lookup() !== 'idle' && this.lookup() !== 'loading' && !this.hasLocation());

  readonly errors = computed<Record<AddressField, string>>(() => {
    if (!this.submitted()) return { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' };
    const cep = onlyDigits(this.cep());
    return {
      cep: !cep ? 'Informe o CEP.' : cep.length !== 8 ? 'Informe os 8 dígitos do CEP.' : '',
      street: requiredError(this.street(), 'Informe a rua.'),
      number: requiredError(this.number(), 'Informe o número.'),
      neighborhood: requiredError(this.neighborhood(), 'Informe o bairro.'),
      city: requiredError(this.city(), 'Informe a cidade.'),
      state: requiredError(this.state(), 'Informe a UF.'),
    };
  });
  readonly locationRequired = computed(() => this.submitted() && onlyDigits(this.cep()).length === 8 && !this.hasLocation());

  readonly cepInput = viewChild<ElementRef<HTMLInputElement>>('cepInput');
  readonly streetInput = viewChild<ElementRef<HTMLInputElement>>('streetInput');
  readonly numberInput = viewChild<ElementRef<HTMLInputElement>>('numberInput');
  readonly neighborhoodInput = viewChild<ElementRef<HTMLInputElement>>('neighborhoodInput');
  readonly cityInput = viewChild<ElementRef<HTMLInputElement>>('cityInput');
  readonly stateInput = viewChild<ElementRef<HTMLInputElement>>('stateInput');
  /** O botão hospeda o TgButton: sem `read`, a consulta devolveria o componente. */
  readonly locationButton = viewChild('locationButton', { read: ElementRef<HTMLButtonElement> });

  /** Cada mudança de CEP (só dígitos). O switchMap cancela a consulta anterior. */
  readonly #cepChanges = new Subject<string>();
  /** Pedido de localização em andamento; cai quando o CEP muda. */
  #locationRequest: Subscription | null = null;

  constructor() {
    this.#cepChanges
      .pipe(
        switchMap((cep) =>
          cep.length !== 8
            ? of({ result: null, status: 'idle' as const })
            : this.#geolocalization.getLatLngByCep(cep).pipe(
                map((result) => ({ result, status: 'found' as const })),
                catchError((error: { status?: number }) =>
                  of({ result: null, status: error?.status === 404 ? ('notFound' as const) : ('error' as const) }),
                ),
                startWith({ result: null, status: 'loading' as const }),
              ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ result, status }) => {
        this.lookup.set(status);
        if (!result) return;
        this.street.set(result.street ?? result.raw?.street ?? '');
        this.neighborhood.set(result.neighborhood ?? result.raw?.district ?? '');
        this.city.set(result.city ?? '');
        this.state.set(result.state ?? '');
        this.lat.set(Number(result.latitude ?? result.raw?.lat ?? 0));
        this.lng.set(Number(result.longitude ?? result.raw?.lng ?? 0));
      });
  }

  /**
   * Coordenadas valem para o CEP em que foram obtidas: um CEP diferente as
   * descarta, junto com a consulta e o pedido de localização em andamento.
   * Sem mudança nos dígitos, nada muda.
   */
  setCep(value: string) {
    const before = onlyDigits(this.cep());
    this.cep.set(value);
    const cep = onlyDigits(value);
    if (cep === before) return;
    this.#locationRequest?.unsubscribe();
    this.#locationRequest = null;
    this.locationError.set('');
    this.lat.set(0);
    this.lng.set(0);
    this.#cepChanges.next(cep);
  }

  useMyLocation() {
    if (this.locating()) return;
    this.locating.set(true);
    this.locationError.set('');
    this.#locationRequest = this.#geolocalization
      .getCurrentPosition()
      .pipe(
        finalize(() => this.locating.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ latitude, longitude }) => {
          this.lat.set(latitude);
          this.lng.set(longitude);
          this.#liveAnnouncer.announce('Localização registrada');
        },
        error: () =>
          this.locationError.set('Não foi possível obter sua localização. Permita o acesso no navegador e tente de novo.'),
      });
  }

  saveAddress() {
    this.submitted.set(true);
    const errors = this.errors();
    const invalid = focusFirstInvalid([
      { error: errors.cep, element: this.cepInput()?.nativeElement },
      { error: errors.street, element: this.streetInput()?.nativeElement },
      { error: errors.number, element: this.numberInput()?.nativeElement },
      { error: errors.neighborhood, element: this.neighborhoodInput()?.nativeElement },
      { error: errors.city, element: this.cityInput()?.nativeElement },
      { error: errors.state, element: this.stateInput()?.nativeElement },
      { error: this.locationRequired() ? 'location' : '', element: this.locationButton()?.nativeElement },
    ]);
    if (invalid || this.lookup() === 'loading') return;

    this.#registerUser.addAddress({
      ...this.#draft,
      cep: this.cep(),
      street: this.street().trim(),
      number: this.number().trim(),
      complement: this.complement().trim(),
      neighborhood: this.neighborhood().trim(),
      city: this.city().trim(),
      state: this.state().trim().toUpperCase(),
      lat: this.lat(),
      lng: this.lng(),
    });
    this.#liveAnnouncer.announce('Endereço salvo');
    this.#router.navigateByUrl('/authenticate/register');
  }
}
