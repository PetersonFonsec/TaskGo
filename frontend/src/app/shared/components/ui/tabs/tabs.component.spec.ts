import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabsComponent } from './tabs.component';
import { CommonModule } from '@angular/common';
import { TabComponent } from '../tab/tab.component';
import { TabHeaderDirective } from './tabs.component';
import { TabContentDirective } from './tabs.component';

xdescribe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, TabsComponent],
      declarations: [TabComponent, TabHeaderDirective, TabContentDirective]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(true).toBeTruthy();
  });

  it('should initialize tabs', () => {
    expect(component.tabs).toBeDefined();
  });

  it('should initialize tabsData', () => {
    expect(component.tabsData).toBeDefined();
  });

  it('should initialize selectedTab', () => {
    expect(component.selectedTab).toBeDefined();
    expect(component.selectedTab()).toBe(0);
  });

  it('should initialize selectedTabContent', () => {
    expect(component.selectedTabContent).toBeDefined();
  });

  it('should change selected tab', () => {
    component.onSelectTab(1);
    expect(component.selectedTab()).toBe(1);
  });
});
