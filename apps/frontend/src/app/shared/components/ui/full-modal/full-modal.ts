import { Component, input, output } from '@angular/core';

import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { Roles } from '@shared/enums/roles.enum';

@Component({
  selector: 'app-full-modal',
  imports: [ButtonComponent],
  templateUrl: './full-modal.html',
  styleUrl: './full-modal.scss',
})
export class FullModal {
  color = input(Roles.PROVIDER);
  closeModal = output<void>();
  showModal = input(false);
  message = input("");
  title = input("");
  
  onClose() {
    this.closeModal.emit();
  }
}
