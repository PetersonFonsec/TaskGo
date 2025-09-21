
import { Component } from '@angular/core';
import { IonApp, IonSplitPane, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    IonApp,
    IonSplitPane,
    IonRouterOutlet
  ],
})
export class AppComponent {}
