import { Component } from '@angular/core';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-page',
  imports: [Header, Footer],
  templateUrl: './page.html',
  styleUrl: './page.scss',
})
export class Page {

}
