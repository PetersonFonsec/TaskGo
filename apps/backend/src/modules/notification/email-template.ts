/**
 * Conteúdo de um e-mail transacional. O mesmo conteúdo gera a versão em texto
 * e a versão HTML, para que as duas nunca divirjam.
 */
export interface EmailContent {
  subject: string;
  /** Resumo exibido pelos clientes de e-mail ao lado do assunto. */
  preheader?: string;
  /** Ex.: "Olá, Ana." */
  greeting?: string;
  paragraphs: string[];
  /** Código em destaque (verificação de e-mail). */
  code?: string;
  cta?: { label: string; url: string };
  /** Observação final em letra menor (validade do link, "ignore se não foi você"). */
  footnote?: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const BRAND = 'Proxi';
const COLORS = {
  primary: '#5b34f1',
  ink: '#181625',
  muted: '#686574',
  background: '#f7f6fb',
  border: '#e2deeb',
  surface: '#ffffff',
  tint: '#f4f1fe',
};
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function renderEmail(content: EmailContent): RenderedEmail {
  return {
    subject: content.subject,
    text: renderText(content),
    html: renderHtml(content),
  };
}

function renderText(content: EmailContent): string {
  const blocks: string[] = [];
  if (content.greeting) blocks.push(content.greeting);
  const body = [...content.paragraphs];
  if (content.code) body.push(content.code);
  if (content.cta) body.push(`${content.cta.label}: ${content.cta.url}`);
  blocks.push(body.join('\n'));
  if (content.footnote) blocks.push(content.footnote);
  return blocks.join('\n\n');
}

function renderHtml(content: EmailContent): string {
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${COLORS.ink};">${escapeHtml(text)}</p>`;
  const parts: string[] = [];
  if (content.greeting) parts.push(paragraph(content.greeting));
  parts.push(...content.paragraphs.map(paragraph));
  if (content.code)
    parts.push(
      `<p style="margin:8px 0 24px;padding:16px;border-radius:12px;background:${COLORS.tint};text-align:center;font-size:28px;line-height:32px;font-weight:700;letter-spacing:6px;color:${COLORS.ink};font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${escapeHtml(content.code)}</p>`,
    );
  if (content.cta) {
    const url = escapeHtml(safeUrl(content.cta.url));
    parts.push(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:12px;background:${COLORS.primary};">` +
        `<a href="${url}" target="_blank" style="display:inline-block;padding:14px 24px;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(content.cta.label)}</a>` +
        `</td></tr></table>` +
        `<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${COLORS.muted};">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${url}" style="color:${COLORS.primary};word-break:break-all;">${url}</a></p>`,
    );
  }
  if (content.footnote)
    parts.push(
      `<p style="margin:16px 0 0;font-size:13px;line-height:20px;color:${COLORS.muted};">${escapeHtml(content.footnote)}</p>`,
    );

  const preheader = content.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>`
    : '';

  return (
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="color-scheme" content="light"><title>${escapeHtml(content.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:${COLORS.background};font-family:${FONT};">` +
    preheader +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.background};"><tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">` +
    `<tr><td style="padding:0 8px 16px;font-size:22px;font-weight:700;color:${COLORS.primary};">${BRAND}</td></tr>` +
    `<tr><td style="padding:32px 28px;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:16px;">${parts.join('')}</td></tr>` +
    `<tr><td style="padding:16px 8px 0;font-size:12px;line-height:18px;color:${COLORS.muted};">Você recebeu este e-mail porque tem uma conta na ${BRAND}. Esta é uma mensagem automática; não é preciso respondê-la.</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Links dos e-mails só podem ser http(s); qualquer outra coisa vira "#". */
function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '#';
  } catch {
    return '#';
  }
}
