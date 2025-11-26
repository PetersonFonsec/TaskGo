import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { switchMap, tap } from 'rxjs';

import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Utils } from '@shared/service/utils/utils.service';

@Component({
  selector: 'app-pending-approval',
  imports: [
    ButtonComponent,
    FullModal
  ],
  templateUrl: './pending-approval.html',
  styleUrl: './pending-approval.scss',
})
export class PendingApproval implements OnInit {
  #activatedRoute = inject(ActivatedRoute);
  #userLogged = inject(UserLoggedService);
  #liveAnnouncer = inject(LiveAnnouncer);
  #router = inject(Router);
  #order = inject(Order);

  order = signal<any>({});
  showModal = signal(false);
  modalMessage = signal("");
  error = signal("");
  orderId = signal('');

  ngOnInit(): void {
    this.#activatedRoute.params.pipe(
      tap(({ orderId }) => this.orderId.set(orderId)),
      switchMap(({ orderId }) =>
        this.#order.getOrderSumary(orderId)
      )
    ).subscribe({
      next: (provider: any) => {
        this.order.set(provider);
        console.log(provider);
      }
    });
  }

  async confirm() {
    const user = this.#userLogged.user().user;
    await this.#order.confirmOrder(this.orderId(), user.id).toPromise();
    this.#liveAnnouncer.announce("Solicitação aprovada com sucesso");
    this.modalMessage.set("Solicitação aprovada com sucesso");
    this.showModal.set(true);
  }

  async cancel() {
    const user = this.#userLogged.user().user;
    await this.#order.cancelOrder(this.orderId(), user.id).toPromise();
    this.#liveAnnouncer.announce("Solicitação cancelada com sucesso");
    this.modalMessage.set("Solicitação cancelada com sucesso");
    this.showModal.set(true);
  }


  goToHome() {
    const user = this.#userLogged.user().user;
    this.#router.navigateByUrl(Utils.getRouteByRole(user.type));
  }
}
