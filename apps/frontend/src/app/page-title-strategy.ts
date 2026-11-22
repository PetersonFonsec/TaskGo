import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const publicPages = new Map([
  ['/authenticate', {
    title: 'Boas-vindas ao TaskGo',
    description: 'Entre ou crie uma conta para contratar profissionais ou oferecer serviços pelo TaskGo.',
  }],
  ['/authenticate/login', {
    title: 'Entrar no TaskGo',
    description: 'Entre na sua conta TaskGo para acompanhar pedidos e gerenciar seus serviços.',
  }],
  ['/authenticate/register', {
    title: 'Criar conta no TaskGo',
    description: 'Cadastre-se no TaskGo para encontrar profissionais perto de você ou oferecer seus serviços.',
  }],
]);

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  override updateTitle(state: RouterStateSnapshot): void {
    const path = state.url.split(/[?#]/, 1)[0].replace(/\/$/, '');
    const page = publicPages.get(path);
    const title = page?.title ?? 'Plataforma TaskGo';
    const description = page?.description
      ?? 'Encontre profissionais, ofereça serviços e acompanhe seus pedidos na plataforma TaskGo.';
    this.title.setTitle(this.buildTitle(state) ?? title);
    this.meta.updateTag({ name: 'robots', content: page ? 'index, follow' : 'noindex, nofollow' });
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    // Use the configured public origin during both prerendering and client navigation.
    const image = this.meta.getTag('property="og:image"');
    if (!image) return;
    const url = new URL(page ? path : '/authenticate', image.content).href;
    this.meta.updateTag({ property: 'og:url', content: url });
    const canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!page) {
      canonical?.remove();
      return;
    }
    const link = canonical ?? this.document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    if (!canonical) this.document.head.appendChild(link);
  }
}
