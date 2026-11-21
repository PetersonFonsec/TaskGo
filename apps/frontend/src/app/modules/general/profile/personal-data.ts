import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, type Observable, of, startWith } from 'rxjs';
import type { PublicUserProfile, UserProfileUpdateRequest } from '@taskgo/shared';

import { EMAIL_PATTERN } from '@modules/auth/login/login';

/**
 * Regras de "Dados pessoais" (ver e editar perfil, Etapa 10). Funções puras,
 * com testes próprios, usadas pelas duas telas.
 */

/** Estado da navegação que a edição deixa ao salvar, para a tela de dados confirmar. */
export const PROFILE_SAVED_STATE = 'profileSaved';

/** Limites do DTO da API (`apps/backend/src/modules/user/dto/update-user.dto.ts`). */
export const NAME_MAX = 150;
export const PHOTO_URL_MAX = 2048;
/** O telefone que a API aceita (`Phone.isValid`): de 10 a 13 dígitos, sem contar a máscara. */
export const PHONE_MIN_DIGITS = 10;
export const PHONE_MAX_DIGITS = 13;

export const onlyDigits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

export type ProfileRole = 'provider' | 'customer' | 'unknown';

export function profileRole(type: string | null | undefined): ProfileRole {
  if (type === 'PRESTADOR' || type === 'PROVIDER') return 'provider';
  if (type === 'CLIENTE' || type === 'CUSTOMER') return 'customer';
  return 'unknown';
}

/** Até duas iniciais do nome ("Ana Clara Souza" vira "AS"). */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Telefone para leitura: "(11) 91234-5678", "(11) 3456-7890" ou, com o
 * DDI do Brasil, "+55 (11) 91234-5678". Nenhum dígito sai; outro tamanho
 * fica como a API guardou.
 */
export function formatPhone(value: string | null | undefined): string {
  const digits = onlyDigits(value);
  const local = (part: string) =>
    part.length === 11
      ? `(${part.slice(0, 2)}) ${part.slice(2, 7)}-${part.slice(7)}`
      : `(${part.slice(0, 2)}) ${part.slice(2, 6)}-${part.slice(6)}`;
  if (digits.length === 10 || digits.length === 11) return local(digits);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return `+55 ${local(digits.slice(2))}`;
  return (value ?? '').trim();
}

export interface PersonalDataDraft {
  photoUrl: string;
  name: string;
  email: string;
  phone: string;
}

export type PersonalDataErrors = Record<keyof PersonalDataDraft, string>;

export function draftFrom(profile: PublicUserProfile): PersonalDataDraft {
  return {
    photoUrl: profile.photoUrl ?? '',
    name: profile.name ?? '',
    email: profile.email ?? '',
    phone: formatPhone(profile.phone),
  };
}

/** Uma parte do domínio, como o `isFQDN` do validator (sem sublinhado e sem hífen nas pontas). */
const DOMAIN_LABEL = /^[a-z\u00a1-\uffff0-9-]+$/i;
const DOMAIN_TLD = /^([a-z\u00A1-\u00A8\u00AA-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}|xn[a-z0-9-]{2,})$/i;
const EMAIL_USER_PART = /^[a-z\d!#$%&'*+\-/=?^_`{|}~\u00A1-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i;
const EMAIL_QUOTED_USER =
  /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;
const byteLength = (value: string) => new TextEncoder().encode(value).length;

/**
 * O e-mail que o PATCH /user/:id aceita. A API confere duas vezes: o
 * `@IsEmail()` do `UpdateUserDto` (class-validator, `isEmail` do validator
 * com as opções padrão) e o `Email.isValid` do domínio, a mesma expressão do
 * login. Só a expressão deixaria passar, por exemplo, `ana@empresa.c`,
 * `ana..souza@empresa.com` e `ana@empresa-.com`, que a API recusa. Aqui ficam
 * as regras do `isEmail` padrão: até 254 caracteres, usuário até 64 bytes,
 * domínio com terminação de letras (2 ou mais), partes até 63 caracteres,
 * sem sublinhado nem hífen nas pontas, e usuário sem ponto nas pontas nem
 * ponto duplo.
 */
export function isApiEmail(email: string): boolean {
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return false;
  const at = email.lastIndexOf('@');
  const user = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (byteLength(user) > 64 || byteLength(domain) > 254) return false;

  const labels = domain.split('.');
  if (labels.length < 2 || !DOMAIN_TLD.test(labels[labels.length - 1])) return false;
  const validLabel = (label: string) =>
    label.length <= 63 && DOMAIN_LABEL.test(label) && !/[\uff01-\uff5e]/.test(label) && !/^-|-$/.test(label);
  if (!labels.every(validLabel)) return false;

  if (user.startsWith('"') && user.endsWith('"')) return EMAIL_QUOTED_USER.test(user.slice(1, -1));
  return user.split('.').every((part) => EMAIL_USER_PART.test(part));
}

/**
 * Os erros de cada campo, com o texto que diz como corrigir. O que passa
 * aqui a API aceita: nome até 150 caracteres, e-mail que passa no
 * `@IsEmail()` e no `Email.isValid` (`isApiEmail`), telefone com 10 a 13 dígitos (`Phone.isValid`) e foto
 * até 2048 caracteres. Nome obrigatório e foto só em HTTPS são regras da
 * tela, que já existiam.
 */
export function validatePersonalData(draft: PersonalDataDraft): PersonalDataErrors {
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = onlyDigits(draft.phone);
  const photo = draft.photoUrl.trim();
  return {
    name: !name ? 'Informe seu nome.' : name.length > NAME_MAX ? `Use até ${NAME_MAX} caracteres.` : '',
    email: !email ? 'Informe seu e-mail.' : isApiEmail(email) ? '' : 'Informe um e-mail válido, como nome@email.com.',
    phone: !phone
      ? 'Informe o telefone com DDD.'
      : phone.length < PHONE_MIN_DIGITS || phone.length > PHONE_MAX_DIGITS || /[^\d\s()+.-]/.test(draft.phone)
        ? 'Informe o telefone com DDD, como (11) 91234-5678.'
        : '',
    photoUrl: !photo
      ? ''
      : photo.length > PHOTO_URL_MAX
        ? `Use um link com até ${PHOTO_URL_MAX} caracteres.`
        : /^https:\/\/\S+$/i.test(photo)
          ? ''
          : 'Use um link que comece com https://.',
  };
}

export const hasErrors = (errors: PersonalDataErrors) => Object.values(errors).some(Boolean);

/**
 * Só o que mudou, já normalizado (nome e e-mail sem espaços nas pontas,
 * telefone só com dígitos, como a API guarda; foto vazia vira null, que a
 * remove). A API marca e-mail e telefone como não verificados sempre que
 * eles chegam no pedido, então mandar o mesmo valor de novo apagaria a
 * verificação.
 */
export function profileChanges(profile: PublicUserProfile, draft: PersonalDataDraft): UserProfileUpdateRequest {
  const changes: { -readonly [K in keyof UserProfileUpdateRequest]: UserProfileUpdateRequest[K] } = {};
  const photo = draft.photoUrl.trim() || null;
  if (photo !== (profile.photoUrl?.trim() || null)) changes.photoUrl = photo;
  const name = draft.name.trim();
  if (name !== (profile.name ?? '').trim()) changes.name = name;
  const email = draft.email.trim();
  if (email !== (profile.email ?? '').trim()) changes.email = email;
  const phone = onlyDigits(draft.phone);
  if (phone !== onlyDigits(profile.phone)) changes.phone = phone;
  return changes;
}

/** Por que o perfil não carregou: sessão vencida, sem conta na sessão, ou outra falha. */
export type ProfileLoadError = 'session' | 'noUser' | 'failed';

export type ProfileLoad =
  | { status: 'loading' }
  | { status: 'ready'; profile: PublicUserProfile }
  | { status: 'error'; error: ProfileLoadError };

/** O GET do perfil como estado da tela (carregando, pronto ou erro). */
export function profileLoad(request: Observable<PublicUserProfile>): Observable<ProfileLoad> {
  return request.pipe(
    map((profile): ProfileLoad => ({ status: 'ready', profile })),
    catchError((error: unknown) =>
      of<ProfileLoad>({ status: 'error', error: httpStatus(error) === 401 ? 'session' : 'failed' }),
    ),
    startWith<ProfileLoad>({ status: 'loading' }),
  );
}

export function httpStatus(error: unknown): number {
  return error instanceof HttpErrorResponse ? error.status : 0;
}

/** O que dizer quando o PATCH falha (as mensagens da API vêm em inglês, por isso o texto é da tela). */
export function saveErrorMessage(error: unknown): string {
  const status = httpStatus(error);
  if (status === 401) return 'Sua sessão expirou. Entre de novo para salvar.';
  if (status === 400) return 'Confira o e-mail e o telefone e tente de novo.';
  return 'Verifique sua conexão e tente de novo. Se trocou o e-mail, confira se ele não é de outra conta.';
}
