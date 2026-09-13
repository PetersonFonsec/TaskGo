import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardDetail } from './card-detail';

describe('CardDetail', () => {
  let fixture: ComponentFixture<CardDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CardDetail] }).compileComponents();
    fixture = TestBed.createComponent(CardDetail);
    fixture.detectChanges();
  });

  it('does not render an image or verification badge by default', () => {
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-badge')).toBeNull();
  });

  it('renders the provider image supplied through the input', () => {
    fixture.componentRef.setInput('image', '/provider.png');
    fixture.detectChanges();
    const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(image.getAttribute('src')).toBe('/provider.png');
    expect(image.alt).toBe('foto de perfil do prestador de serviço');
  });

  it('renders a verification badge only for a verified provider', () => {
    fixture.componentRef.setInput('verified', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-badge').textContent).toContain('Verificado');
    fixture.componentRef.setInput('verified', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-badge')).toBeNull();
  });
});
