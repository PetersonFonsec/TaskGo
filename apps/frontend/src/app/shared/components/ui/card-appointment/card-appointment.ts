import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDay, faClock, faLocationDot, faUser } from '@fortawesome/free-solid-svg-icons';
import { OrderModel } from '@shared/service/order/order.model';

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

@Component({
  selector: 'app-card-appointment',
  imports: [FaIconComponent, RouterLink],
  templateUrl: './card-appointment.html',
  styleUrl: './card-appointment.scss',
})
export class CardAppointment {
  order = input.required<OrderModel>();

  calendarIcon = faCalendarDay;
  clockIcon = faClock;
  locationIcon = faLocationDot;
  userIcon = faUser;

  statusLabel = computed(() => STATUS_LABELS[this.order().status] ?? this.order().status);
  statusTone = computed(() => this.order().status.toLowerCase().replaceAll('_', '-'));
  action = computed(() => {
    const order = this.order();
    if (order.status === 'AGUARDANDO_CONFIRMACAO_CLIENTE') {
      return { label: 'Confirmar conclusão', route: ['/orders', order.id, 'confirm'] };
    }
    if (order.status === 'CONCLUIDO' && !order.review) {
      return { label: 'Avaliar prestador', route: ['/orders', order.id, 'review'] };
    }
    return { label: 'Ver detalhes do pedido', route: ['/orders', order.id] };
  });

  scheduledDate = computed(() => {
    const date = this.toDate(this.order().scheduledFor);
    return date
      ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
      : 'A confirmar';
  });

  scheduledTime = computed(() => {
    const date = this.toDate(this.order().scheduledFor);
    return date
      ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
      : 'Horário a definir';
  });

  address = computed(() => {
    const address = this.order().addressSnap;
    if (!address) return 'Endereço a confirmar';

    return [address.street, address.number].filter(Boolean).join(', ') || 'Endereço a confirmar';
  });

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
