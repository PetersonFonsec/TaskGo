/**
 * Nome acessível de um botão, pelo algoritmo Accessible Name and Description
 * Computation 1.2 e pelo HTML-AAM, no recorte que um botão do Design System
 * usa. Serve à verificação de `iconOnly` em desenvolvimento e aos testes.
 *
 * Ordem do botão: aria-labelledby (vários ids, sem encadear), aria-label,
 * <label> associado, conteúdo e, por último, title. Texto só com espaços não
 * conta. Um alvo escondido citado direto por aria-labelledby conta, com todo
 * o seu conteúdo; dentro de um alvo visível, filhos escondidos não contam.
 * No conteúdo, valem aria-label e alt de imagem dos filhos.
 *
 * Fora do recorte (o navegador considera, aqui não): texto de CSS
 * (::before/::after), valor de controles embutidos e papéis que não recebem
 * nome do conteúdo. Conferido contra a árvore de acessibilidade do Chrome.
 */
export function accessibleName(el: Element): string {
  const root = el.getRootNode() as Document | ShadowRoot;
  const refs = idRefs(el.getAttribute('aria-labelledby'))
    .map((id) => root.getElementById?.(id))
    .filter((ref): ref is HTMLElement => !!ref);
  const fromRefs = normalize(refs.map((ref) => textAlternative(ref, isHidden(ref))).join(' '));
  if (fromRefs) return fromRefs;

  const label = normalize(el.getAttribute('aria-label') ?? '');
  if (label) return label;

  const labels = (el as HTMLButtonElement).labels;
  const fromLabels = labels ? normalize(Array.from(labels, (l) => textAlternative(l, false)).join(' ')) : '';
  if (fromLabels) return fromLabels;

  const content = normalize(childrenText(el, false));
  if (content) return content;

  return normalize(el.getAttribute('title') ?? '');
}

/** Lista de ids de aria-labelledby ou aria-describedby. */
export function idRefs(value: string | null): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function textAlternative(node: Node, allowHidden: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element)) return '';
  if (!allowHidden && isHidden(node)) return '';

  const label = normalize(node.getAttribute('aria-label') ?? '');
  if (label) return label;
  if (node instanceof HTMLImageElement) return node.alt;

  const content = childrenText(node, allowHidden);
  return normalize(content) ? content : (node.getAttribute('title') ?? '');
}

function childrenText(el: Element, allowHidden: boolean): string {
  return Array.from(el.childNodes, (child) => textAlternative(child, allowHidden)).join(' ');
}

function isHidden(el: Element): boolean {
  if (el.closest('[aria-hidden="true"]')) return true;
  if (typeof el.checkVisibility === 'function') return !el.checkVisibility({ visibilityProperty: true });
  const style = getComputedStyle(el);
  return style.display === 'none' || style.visibility === 'hidden';
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
