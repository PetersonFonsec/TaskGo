import { Component, input, signal } from '@angular/core';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '../badge/badge';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ButtonComponent } from '../button/button.component';
import { PROVIDER_PROFILE_SUMMARY_CONTENT } from './provider-profile-summary.constants';

@Component({
  selector: 'app-provider-profile-summary',
  imports: [Badge, FontAwesomeModule, ButtonComponent],
  templateUrl: './provider-profile-summary.html',
  styleUrl: './provider-profile-summary.scss',
})
export class ProviderProfileSummary {
  image = input("https://dummyimage.com/600x400/000/fff");
  verified = input(false);

  items = signal(PROVIDER_PROFILE_SUMMARY_CONTENT);
  checkIcon = signal(faCheck);
}
