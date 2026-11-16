import { TestBed } from '@angular/core/testing';

import { Notification } from './notification';

describe('Notification', () => {
  function render(count?: number) {
    const fixture = TestBed.createComponent(Notification);
    if (count !== undefined) fixture.componentRef.setInput('notificationCount', count);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('sem novas: nome "Notificações" e sem selo', () => {
    const button = render();
    expect(button.getAttribute('aria-label')).toBe('Notificações');
    expect(button.querySelector('.notification__badge')).toBeNull();
  });

  it('com novas: a contagem entra no nome e no selo', () => {
    expect(render(1).getAttribute('aria-label')).toBe('Notificações, 1 nova');
    const button = render(2);
    expect(button.getAttribute('aria-label')).toBe('Notificações, 2 novas');
    expect(button.querySelector('.notification__badge')?.textContent?.trim()).toBe('2');
    expect(render(120).querySelector('.notification__badge')?.textContent?.trim()).toBe('99+');
  });
});
