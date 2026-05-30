import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProfileHeaderInfo } from '@shared/components/ui/profile-header-info/profile-header-info';

@Component({
  selector: 'app-profile',
  imports: [RouterOutlet, ProfileHeaderInfo],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {

}
