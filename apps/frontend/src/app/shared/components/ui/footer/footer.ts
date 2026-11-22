import { ChangeDetectionStrategy, Component } from '@angular/core';
/** Rodapé do shell logado no Design System: marca e direitos. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
