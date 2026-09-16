import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Drawer } from './drawer';

@Component({
  imports: [Drawer],
  template: `
    <button (click)="drawer.open()">Abrir</button>
    <app-drawer #drawer title="Teste">
      <h2 drawerHeader>Cabeçalho personalizado</h2>
      <div drawerContent style="height: 2000px">Campos do formulário</div>
      <div drawerFooter>
        <button type="button">Salvar</button>
        <button type="button" (click)="drawer.close()">Cancelar</button>
      </div>
    </app-drawer>
  `,
})
class DrawerHost {}

describe('Drawer slots', () => {
  it('keeps header and footer visible while only content scrolls', async () => {
    await TestBed.configureTestingModule({ imports: [DrawerHost] }).compileComponents();
    const fixture = TestBed.createComponent(DrawerHost);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    const header = dialog.querySelector('header')!;
    const content = dialog.querySelector('.drawer-content') as HTMLElement;
    const footer = dialog.querySelector('footer')!;
    expect(header.textContent).toContain('Cabeçalho personalizado');
    expect(content.textContent).toContain('Campos do formulário');
    expect(footer.textContent).toContain('Salvar');
    expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
    const headerTop = header.getBoundingClientRect().top;
    const footerTop = footer.getBoundingClientRect().top;
    content.scrollTop = 800;
    expect(content.scrollTop).toBeGreaterThan(0);
    expect(header.getBoundingClientRect().top).toBe(headerTop);
    expect(footer.getBoundingClientRect().top).toBe(footerTop);
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    (footer.querySelectorAll('button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(dialog.open).toBeFalse();
    fixture.destroy();
  });
});
