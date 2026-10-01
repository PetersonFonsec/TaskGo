export type OrderDetailsViewer = 'CLIENTE' | 'PRESTADOR';

export class GetOrderDetailsQuery {
  constructor(
    public readonly id: bigint,
    public readonly viewer: OrderDetailsViewer = 'CLIENTE',
  ) {}
}
