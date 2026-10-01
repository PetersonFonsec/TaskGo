import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  ProviderBankAccountHolderType,
  ProviderBankAccountType,
  ProviderBankAccountUpdateRequest,
  ProviderPayoutStatusResponse,
} from '@taskgo/shared';
import { environment } from '@environments/environment';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

type PayoutTone = 'pending' | 'review' | 'ready' | 'error';

export const PAYOUT_BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '077', name: 'Banco Inter' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '260', name: 'Nubank' },
  { code: '290', name: 'PagBank' },
  { code: '323', name: 'Mercado Pago' },
  { code: '336', name: 'C6 Bank' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '380', name: 'PicPay' },
  { code: '748', name: 'Sicredi' },
  { code: '756', name: 'Sicoob' },
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION:
    'O Pagar.me recusou os dados informados. Confira banco, agência, conta e documento do titular.',
  REJECTED:
    'Sua conta de recebimento foi recusada na análise do Pagar.me. Revise os dados ou fale com o suporte.',
  TRANSIENT:
    'O gateway de pagamentos está indisponível no momento. Tente novamente em alguns minutos.',
  AUTHENTICATION:
    'O gateway de pagamentos não está configurado corretamente. Tente mais tarde ou fale com o suporte.',
  CONFLICT: 'O gateway encontrou um cadastro conflitante. Fale com o suporte.',
};
const SYNCING = 'SYNCING';
export const OTHER_BANK = 'OTHER';

@Component({
  selector: 'app-provider-payouts',
  imports: [FormsModule, RouterLink, ButtonComponent],
  templateUrl: './provider-payouts.page.html',
  styleUrl: './provider-payouts.page.scss',
})
export class ProviderPayoutsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sessionUser = inject(UserLoggedService).user()?.user;
  private readonly endpoint = environment.url + '/provider/me/payout';

  readonly banks = PAYOUT_BANKS;
  readonly otherBank = OTHER_BANK;
  readonly status = signal<ProviderPayoutStatusResponse | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  draft = this.emptyDraft();

  readonly view = computed(() => {
    const status = this.status();
    if (!status) return null;
    return this.describe(status);
  });

  readonly syncError = computed(() => {
    const code = this.status()?.errorCode;
    if (!code || code === SYNCING) return '';
    return (
      ERROR_MESSAGES[code] ??
      'Não foi possível sincronizar sua conta de recebimento. Tente novamente.'
    );
  });

  readonly maskedAccount = computed(() => {
    const account = this.status()?.bankAccount;
    if (!account) return null;
    const bank = this.banks.find((item) => item.code === account.bankCode);
    return {
      bank: account.bankName ?? bank?.name ?? `Banco ${account.bankCode ?? ''}`.trim(),
      branch: account.branchLastDigits ? `••${account.branchLastDigits}` : '—',
      account: account.accountLastDigits ? `•••${account.accountLastDigits}` : '—',
    };
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    this.http.get<ProviderPayoutStatusResponse>(this.endpoint).subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Não foi possível carregar seus dados de recebimento.');
      },
    });
  }

  save() {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    this.busy.set(true);
    this.http.put<ProviderPayoutStatusResponse>(this.endpoint, this.payload()).subscribe({
      next: (status) => {
        this.busy.set(false);
        this.status.set(status);
        if (!status.errorCode) {
          this.message.set('Dados de recebimento enviados ao Pagar.me.');
          this.clearAccountFields();
        }
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          [e.error?.message ?? 'Não foi possível salvar seus dados de recebimento.']
            .flat()
            .join(' '),
        );
      },
    });
  }

  documentLabel() {
    return this.draft.holderType === 'COMPANY' ? 'CNPJ do titular' : 'CPF do titular';
  }

  private describe(status: ProviderPayoutStatusResponse): {
    tone: PayoutTone;
    label: string;
    description: string;
  } {
    if (status.errorCode === SYNCING)
      return {
        tone: 'review',
        label: 'Sincronizando',
        description: 'Estamos enviando seus dados ao Pagar.me. Atualize em instantes.',
      };
    if (status.payoutReady)
      return {
        tone: 'ready',
        label: 'Pronto para receber',
        description: 'Sua conta foi confirmada. Clientes já podem pagar pelos seus serviços.',
      };
    if (status.syncStatus === 'REJECTED')
      return {
        tone: 'error',
        label: 'Recusada',
        description: 'A conta não foi aprovada. Revise os dados e envie novamente.',
      };
    if (status.syncStatus === 'NOT_CONFIGURED')
      return status.errorCode
        ? {
            tone: 'error',
            label: 'Erro no cadastro',
            description: 'Não conseguimos cadastrar sua conta. Revise os dados e tente novamente.',
          }
        : {
            tone: 'pending',
            label: 'Pendente',
            description:
              'Cadastre a conta onde você quer receber. Sem ela, clientes não conseguem pagar pelos seus serviços.',
          };
    return {
      tone: 'review',
      label: 'Em análise',
      description:
        'O Pagar.me está analisando sua conta. Você será liberado para receber assim que ela for confirmada.',
    };
  }

  private payload(): ProviderBankAccountUpdateRequest {
    const digits = (value: string) => value.replace(/\D/g, '');
    return {
      holderName: this.draft.holderName.trim(),
      holderType: this.draft.holderType,
      holderDocument: digits(this.draft.holderDocument),
      bankCode: (this.draft.bankChoice === OTHER_BANK
        ? this.draft.customBankCode
        : this.draft.bankChoice
      ).trim(),
      branchNumber: digits(this.draft.branchNumber),
      branchCheckDigit: this.draft.branchCheckDigit.trim() || null,
      accountNumber: digits(this.draft.accountNumber),
      accountCheckDigit: this.draft.accountCheckDigit.trim(),
      accountType: this.draft.accountType,
    };
  }

  private clearAccountFields() {
    this.draft = {
      ...this.draft,
      branchNumber: '',
      branchCheckDigit: '',
      accountNumber: '',
      accountCheckDigit: '',
    };
  }

  private emptyDraft() {
    return {
      holderName: this.sessionUser?.name ?? '',
      holderType: 'INDIVIDUAL' as ProviderBankAccountHolderType,
      holderDocument: this.sessionUser?.cpf ?? '',
      bankChoice: '',
      customBankCode: '',
      branchNumber: '',
      branchCheckDigit: '',
      accountNumber: '',
      accountCheckDigit: '',
      accountType: 'CHECKING' as ProviderBankAccountType,
    };
  }
}
