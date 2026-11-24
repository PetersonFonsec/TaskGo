import { renderEmail } from './email-template';

describe('renderEmail', () => {
  const content = {
    subject: 'Seu pedido foi aceito',
    preheader: 'Pague o PIX',
    greeting: 'Olá, Ana.',
    paragraphs: ['Primeiro parágrafo.', 'Segundo parágrafo.'],
    cta: { label: 'Pagar', url: 'https://app.proxi.test/orders/42/payment' },
    footnote: 'Se não foi você, ignore.',
  };

  it('gera texto puro com saudação, parágrafos, link e observação', () => {
    expect(renderEmail(content).text).toBe(
      'Olá, Ana.\n\n' +
        'Primeiro parágrafo.\nSegundo parágrafo.\n' +
        'Pagar: https://app.proxi.test/orders/42/payment\n\n' +
        'Se não foi você, ignore.',
    );
  });

  it('gera HTML com botão, link alternativo e resumo oculto', () => {
    const { html, subject } = renderEmail(content);
    expect(subject).toBe('Seu pedido foi aceito');
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('href="https://app.proxi.test/orders/42/payment"');
    expect(html).toContain('>Pagar</a>');
    expect(html).toContain('Pague o PIX');
    expect(html).toContain('Segundo parágrafo.');
  });

  it('escapa o conteúdo vindo do usuário', () => {
    const { html } = renderEmail({
      subject: 'x',
      greeting: 'Olá, <script>alert(1)</script>.',
      paragraphs: ['Serviço "Limpeza & Cia"'],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;Limpeza &amp; Cia&quot;');
  });

  it('não permite links que não sejam http(s)', () => {
    const { html } = renderEmail({
      subject: 'x',
      paragraphs: [],
      cta: { label: 'Abrir', url: 'javascript:alert(1)' },
    });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });

  it('destaca o código de verificação', () => {
    const { html, text } = renderEmail({
      subject: 'Código',
      paragraphs: ['Use o código abaixo.'],
      code: 'AB12CD',
    });
    expect(text).toContain('AB12CD');
    expect(html).toContain('letter-spacing:6px');
    expect(html).toContain('AB12CD');
  });
});
