import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonTitle,
    IonHeader,
  ]
})
export class LoginPage implements OnInit {
  ngOnInit() { }
}
