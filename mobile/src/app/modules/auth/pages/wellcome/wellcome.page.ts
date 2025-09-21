import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonRouterLink, IonText } from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-wellcome',
  templateUrl: './wellcome.page.html',
  styleUrls: ['./wellcome.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    RouterModule,
    IonRouterLink,
    IonText
  ]
})
export class WellcomePage implements OnInit {
  ngOnInit() {}
}
