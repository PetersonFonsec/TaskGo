import { MaskDirective } from './mask.directive';
import { ElementRef, Renderer2 } from '@angular/core';

describe('MaskDirective', () => {
  let directive: MaskDirective;
  let mockElementRef: ElementRef;
  let mockRenderer: Renderer2;

  beforeEach(() => {
    mockElementRef = { nativeElement: document.createElement('input') } as ElementRef;
    mockRenderer = jasmine.createSpyObj('Renderer2', ['setProperty']);
    directive = new MaskDirective(mockElementRef, mockRenderer);
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should apply numeric mask (XXX.XXX.XXX-XX)', () => {
    directive.mask = 'XXX.XXX.XXX-XX';
    directive.onInputChange('12345678901');

    expect(mockRenderer.setProperty).toHaveBeenCalledWith(
      mockElementRef.nativeElement,
      'value',
      '123.456.789-01'
    );
  });

  it('should apply alphanumeric mask (XXX.XXX.XXX-AA)', () => {
    directive.mask = 'XXX.XXX.XXX-AA';
    directive.onInputChange('123456789AB');

    expect(mockRenderer.setProperty).toHaveBeenCalledWith(
      mockElementRef.nativeElement,
      'value',
      '123.456.789-AB'
    );
  });

  it('should ignore extra characters beyond the mask length', () => {
    directive.mask = 'XXX.XXX.XXX-XX';
    directive.onInputChange('1234567890123456');

    expect(mockRenderer.setProperty).toHaveBeenCalledWith(
      mockElementRef.nativeElement,
      'value',
      '123.456.789-01'
    );
  });

  it('should handle empty input gracefully', () => {
    directive.mask = 'XXX.XXX.XXX-XX';
    directive.onInputChange('');

    expect(mockRenderer.setProperty).toHaveBeenCalledWith(
      mockElementRef.nativeElement,
      'value',
      ''
    );
  });

  it('should apply a mask with mixed alphanumeric values (XXX-AA-XXX)', () => {
    directive.mask = 'XXX-AA-XXX';
    directive.onInputChange('123AB456');

    expect(mockRenderer.setProperty).toHaveBeenCalledWith(
      mockElementRef.nativeElement,
      'value',
      '123-AB-456'
    );
  });

  it('should skip invalid characters for numeric mask (XXX.XXX.XXX-XX)', () => {
    directive.mask = 'XXX.XXX.XXX-XX';
    directive.onInputChange('12A3B4C56789D09');

    expect(mockRenderer.setProperty).toHaveBeenCalledWith(
      mockElementRef.nativeElement,
      'value',
      '123.456.789-09'
    );
  });

  it('should skip invalid characters for alphanumeric mask (XXX-AA-XXX)', () => {
    directive.mask = 'XXX-AA-XXX';
    directive.onInputChange('123!@#AB$%^456');

    expect(mockRenderer.setProperty).toHaveBeenCalledWith(
      mockElementRef.nativeElement,
      'value',
      '123-AB-456'
    );
  });
});
