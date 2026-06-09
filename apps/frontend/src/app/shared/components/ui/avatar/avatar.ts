import { Component, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  size = input('small');// small | medium | large
  thumb = input();
  alt = input();
}
