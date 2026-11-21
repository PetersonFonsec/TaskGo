import type { PublicUserProfile } from '@taskgo/shared';

import {
  draftFrom,
  formatPhone,
  hasErrors,
  initials,
  isApiEmail,
  NAME_MAX,
  PHOTO_URL_MAX,
  profileChanges,
  profileRole,
  validatePersonalData,
} from './personal-data';

const PROFILE: PublicUserProfile = {
  id: '42',
  name: 'Ana Souza',
  email: 'ana@email.com',
  phone: '11912345678',
  cpf: '12345678909',
  type: 'CLIENTE',
  photoUrl: null,
  emailVerified: true,
  phoneVerified: true,
};

const valid = { photoUrl: '', name: 'Ana Souza', email: 'ana@email.com', phone: '(11) 91234-5678' };

describe('Dados pessoais: regras', () => {
  it('reconhece os dois formatos de papel', () => {
    expect(profileRole('PRESTADOR')).toBe('provider');
    expect(profileRole('PROVIDER')).toBe('provider');
    expect(profileRole('CLIENTE')).toBe('customer');
    expect(profileRole('CUSTOMER')).toBe('customer');
    expect(profileRole(undefined)).toBe('unknown');
  });

  it('monta as iniciais', () => {
    expect(initials('Ana Clara Souza')).toBe('AS');
    expect(initials(' bruno ')).toBe('B');
    expect(initials('')).toBe('?');
  });

  it('formata o telefone sem perder dígitos', () => {
    expect(formatPhone('11912345678')).toBe('(11) 91234-5678');
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890');
    expect(formatPhone('5511912345678')).toBe('+55 (11) 91234-5678');
    expect(formatPhone('123')).toBe('123');
    expect(formatPhone('')).toBe('');
  });

  describe('validação (alinhada ao UpdateUserDto, Email e Phone da API)', () => {
    it('aceita um rascunho válido', () => {
      expect(hasErrors(validatePersonalData(valid))).toBeFalse();
    });

    it('exige nome e respeita o limite de 150 caracteres', () => {
      expect(validatePersonalData({ ...valid, name: '   ' }).name).toBe('Informe seu nome.');
      expect(validatePersonalData({ ...valid, name: 'a'.repeat(NAME_MAX) }).name).toBe('');
      expect(validatePersonalData({ ...valid, name: 'a'.repeat(NAME_MAX + 1) }).name).toContain('150');
    });

    it('usa a expressão de e-mail da API', () => {
      expect(validatePersonalData({ ...valid, email: '' }).email).toBe('Informe seu e-mail.');
      expect(validatePersonalData({ ...valid, email: 'bad-email' }).email).toContain('e-mail válido');
      expect(validatePersonalData({ ...valid, email: ' ana@email.com ' }).email).toBe('');
    });

    // Regressão: a tela usava só a expressão de `Email.isValid`, mas o
    // `@IsEmail()` do UpdateUserDto recusa antes estes casos (conferidos
    // com o class-validator 0.14.2 / validator 13.15.15 do backend).
    it('recusa o que o @IsEmail() da API recusa e a expressão sozinha aceitava', () => {
      for (const email of [
        'ana@empresa.c',
        'ana@empresa.c0m',
        'ana@empresa.123',
        'ana@1.2.3.4',
        'ana@[1.2.3.4]',
        'ana..souza@empresa.com',
        '.ana@empresa.com',
        'ana.@empresa.com',
        'ana@empresa..com',
        'ana@-empresa.com',
        'ana@empresa-.com',
        'ana@emp_resa.com',
        'ana@empresa.com.',
        'ana(x)@empresa.com',
        'ana,b@empresa.com',
        'ana;b@empresa.com',
        'ana@empresa,com.br',
        'a'.repeat(65) + '@empresa.com',
        'ana@' + 'a'.repeat(64) + '.com',
      ]) {
        expect(isApiEmail(email)).withContext(email).toBeFalse();
        expect(validatePersonalData({ ...valid, email }).email).withContext(email).toContain('e-mail válido');
      }
    });

    it('continua aceitando os e-mails que a API aceita', () => {
      for (const email of [
        'ana@email.com',
        'ana@empresa.com.br',
        'ana.souza+tag@empresa.co',
        'ANA@EMPRESA.COM',
        'a@b.cd',
        'ana#x@empresa.com',
        '"ana"@empresa.com',
        'ãna@empresa.com',
        'ana@empresá.com',
        'ana@empresa.xn--p1ai',
        'a'.repeat(64) + '@empresa.com',
        'ana@' + 'a'.repeat(63) + '.com',
      ]) {
        expect(isApiEmail(email)).withContext(email).toBeTrue();
        expect(validatePersonalData({ ...valid, email }).email).withContext(email).toBe('');
      }
    });

    it('recusa e-mail vazio, sem @ ou com espaço no meio', () => {
      expect(validatePersonalData({ ...valid, email: '   ' }).email).toBe('Informe seu e-mail.');
      expect(validatePersonalData({ ...valid, email: 'ana.empresa.com' }).email).toContain('e-mail válido');
      expect(validatePersonalData({ ...valid, email: 'ana souza@empresa.com' }).email).toContain('e-mail válido');
      expect(validatePersonalData({ ...valid, email: 'ana@empresa .com' }).email).toContain('e-mail válido');
    });

    // Regressão: antes a tela aceitava 8 e 9 dígitos (a API recusa) e
    // recusava o telefone com máscara (a API aceita).
    it('aceita de 10 a 13 dígitos, com ou sem máscara, como Phone.isValid', () => {
      for (const phone of ['(11) 91234-5678', '11912345678', '1134567890', '+55 11 91234-5678']) {
        expect(validatePersonalData({ ...valid, phone }).phone).withContext(phone).toBe('');
      }
      for (const phone of ['12345678', '123456789', '12345678901234', '11 9123x-5678']) {
        expect(validatePersonalData({ ...valid, phone }).phone).withContext(phone).toContain('DDD');
      }
      expect(validatePersonalData({ ...valid, phone: '' }).phone).toBe('Informe o telefone com DDD.');
    });

    it('aceita só foto em HTTPS, até 2048 caracteres, e foto vazia', () => {
      expect(validatePersonalData({ ...valid, photoUrl: 'https://example.com/a.jpg' }).photoUrl).toBe('');
      expect(validatePersonalData({ ...valid, photoUrl: 'javascript:alert(1)' }).photoUrl).toContain('https://');
      expect(validatePersonalData({ ...valid, photoUrl: 'http://example.com/a.jpg' }).photoUrl).toContain('https://');
      const long = 'https://example.com/' + 'a'.repeat(PHOTO_URL_MAX);
      expect(validatePersonalData({ ...valid, photoUrl: long }).photoUrl).toContain('2048');
    });
  });

  describe('o que vai no PATCH', () => {
    it('não manda nada quando nada mudou (o telefone mascarado é o mesmo)', () => {
      expect(profileChanges(PROFILE, draftFrom(PROFILE))).toEqual({});
    });

    // Regressão: antes a tela mandava e-mail e telefone em todo salvamento,
    // e a API desfazia a verificação dos dois mesmo sem mudança.
    it('manda só o campo que mudou, normalizado', () => {
      expect(profileChanges(PROFILE, { ...draftFrom(PROFILE), name: '  Ana Clara  ' })).toEqual({ name: 'Ana Clara' });
      expect(profileChanges(PROFILE, { ...draftFrom(PROFILE), phone: '(21) 3456-7890' })).toEqual({ phone: '2134567890' });
      expect(profileChanges(PROFILE, { ...draftFrom(PROFILE), email: ' nova@email.com ' })).toEqual({ email: 'nova@email.com' });
    });

    it('foto vazia vira null, que a remove', () => {
      const withPhoto = { ...PROFILE, photoUrl: 'https://example.com/a.jpg' };
      expect(profileChanges(withPhoto, { ...draftFrom(withPhoto), photoUrl: '  ' })).toEqual({ photoUrl: null });
      expect(profileChanges(PROFILE, { ...draftFrom(PROFILE), photoUrl: 'https://example.com/b.jpg' })).toEqual({
        photoUrl: 'https://example.com/b.jpg',
      });
    });
  });
});
