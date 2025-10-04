import { IonContent, IonHeader, IonInput, IonItem, IonList, IonRouterLink, IonText, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    RouterModule,
    IonRouterLink,
    IonText,
    IonInput,
    IonList,
    IonItem

  ]
})
export class LoginPage implements OnInit {
  ngOnInit() { }
}
