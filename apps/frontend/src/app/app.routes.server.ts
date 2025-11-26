import { RenderMode, ServerRoute } from '@angular/ssr';

// Routes that include dynamic parameters should not be prerendered because
// prerender requires explicit `getPrerenderParams` to enumerate parameter values.
// Mark these to use Server renderMode so they're rendered per-request instead.
export const serverRoutes: ServerRoute[] = [
  {
    path: 'authenticate/category/:categoryId/service',
    renderMode: RenderMode.Server,
  },
  {
    path: 'provider/:orderId/aprovacao',
    renderMode: RenderMode.Server,
  },
  {
    path: 'customer/:userId',
    renderMode: RenderMode.Server,
  },
  // Fallback: prerender static routes that don't include parameters
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
