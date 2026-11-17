import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

/**
 * Id de quem está na sessão, ou null. A sessão vem do localStorage e pode
 * estar vazia ou incompleta (`{}`, `null` depois do logout).
 */
export function sessionUserId(session: unknown): string | null {
  const user: unknown = session && typeof session === 'object' && 'user' in session ? session.user : null;
  const id: unknown = user && typeof user === 'object' && 'id' in user ? user.id : null;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  return null;
}

/**
 * Para rotas com `:userId` da própria conta (como `/general/:userId/history`).
 * O id da URL nunca é fonte de identidade: a tela usa o da sessão e a
 * autorização real é do backend. Aqui a URL só é corrigida para o id da
 * sessão, mantendo o resto do caminho e os parâmetros (como `?aba=`). Com o
 * id certo (a segunda passada), libera, então não há laço. Sem id na sessão,
 * libera e a tela mostra o erro, sem redirecionar.
 * Use depois do `unauthorizedGuard`, que cuida de quem não está logado.
 */
export const sessionUserGuard: CanActivateFn = (route, state) => {
  const sessionId = sessionUserId(inject(UserLoggedService).user());
  const urlId = route.paramMap.get('userId');
  if (!sessionId || urlId === sessionId) return true;

  const router = inject(Router);
  const tree = router.parseUrl(state.url);
  const segments = tree.root.children['primary']?.segments ?? [];
  const index = segments.findIndex((segment) => segment.path === urlId);
  if (index < 0) return true;
  segments[index].path = sessionId;
  return tree;
};
