import { Component, contentChild, TemplateRef } from '@angular/core';
import { TabContentDirective, TabHeaderDirective } from '../tabs/tabs.component';

@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
  styleUrl: './tab.component.scss'
})
export class TabComponent {
  header = contentChild.required(TabHeaderDirective, { read: TemplateRef });
  content = contentChild.required(TabContentDirective, { read: TemplateRef });
}
