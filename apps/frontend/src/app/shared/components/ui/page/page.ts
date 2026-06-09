import { Component } from '@angular/core';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Aside } from '../aside/aside';

@Component({
  selector: 'app-page',
  imports: [Header, Aside ,Footer],
  templateUrl: './page.html',
  styleUrl: './page.scss',
})
export class Page {

}
