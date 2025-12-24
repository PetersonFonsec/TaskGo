import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabComponent } from './tab.component';
import { TabContentDirective, TabHeaderDirective } from '../tabs/tabs.component';
import { TemplateRef } from '@angular/core';

xdescribe('TabComponent', () => {
  let component: TabComponent;
  let fixture: ComponentFixture<TabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TabComponent, TabContentDirective, TabHeaderDirective]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have header as instance of TemplateRef', () => {
    expect(component.header).toBeInstanceOf(TemplateRef);
  });

  it('should have content as instance of TemplateRef', () => {
    expect(component.content).toBeInstanceOf(TemplateRef);
  });
});
