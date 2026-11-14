import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputTextComponent } from './input-text.component';

describe('InputTextComponent', () => {
  let component: InputTextComponent;
  let fixture: ComponentFixture<InputTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputTextComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InputTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('autofocus', () => {
    let other: HTMLInputElement;

    function createWithAutofocus() {
      const autofocusFixture = TestBed.createComponent(InputTextComponent);
      autofocusFixture.componentRef.setInput('autofocus', true);
      document.body.appendChild(autofocusFixture.nativeElement);
      autofocusFixture.detectChanges();
      return autofocusFixture;
    }

    function input(target: ComponentFixture<InputTextComponent>): HTMLInputElement {
      return target.nativeElement.querySelector('input');
    }

    beforeEach(() => {
      other = document.createElement('input');
      document.body.appendChild(other);
    });

    afterEach(() => {
      other.remove();
      (document.activeElement as HTMLElement | null)?.blur();
    });

    it('foca o campo quando nada está focado', () => {
      (document.activeElement as HTMLElement | null)?.blur();

      const target = createWithAutofocus();

      expect(document.activeElement).toBe(input(target));
      target.nativeElement.remove();
    });

    it('não rouba o foco de um campo que a pessoa já está usando', () => {
      other.focus();

      const target = createWithAutofocus();

      expect(document.activeElement).toBe(other);
      expect(document.activeElement).not.toBe(input(target));
      target.nativeElement.remove();
    });
  });
});
