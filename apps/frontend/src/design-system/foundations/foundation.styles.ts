// Estilos compartilhados pelas páginas de fundamentos do Storybook.
// Usam só tokens --tg-*, então mudam junto com o modo (barra "Modo").
export const foundationStyles = `
  :host { display: block; font-family: var(--tg-font-sans); color: var(--tg-text-primary); }
  .page { display: flex; flex-direction: column; gap: var(--tg-space-8); padding: var(--tg-space-8); max-width: var(--tg-content-max); }
  h2 { margin: 0; font-size: var(--tg-type-title-2-size); line-height: var(--tg-type-title-2-line); font-weight: 800; letter-spacing: var(--tg-tracking-title); }
  p { margin: 0; color: var(--tg-text-secondary); font-size: var(--tg-type-body-sm-size); line-height: var(--tg-type-body-sm-line); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--tg-space-4); }
  .swatch { display: flex; flex-direction: column; border: 1px solid var(--tg-border-default); border-radius: var(--tg-radius-lg); overflow: hidden; background: var(--tg-bg-surface); }
  .chip { height: 72px; }
  .meta { display: flex; flex-direction: column; gap: 2px; padding: var(--tg-space-3); }
  .name { font: 700 13px/18px ui-monospace, Menlo, monospace; }
  .note { font-size: 13px; line-height: 18px; color: var(--tg-text-secondary); }
  .row { display: flex; align-items: center; gap: var(--tg-space-6); padding: var(--tg-space-3) 0; border-bottom: 1px solid var(--tg-border-default); }
  .row .name { width: 180px; flex: none; }
`;
