import { ScheduleOrderDto } from '../../dto/schedule-order.dto';

export class ScheduleOrderCommand {
  constructor(
    public readonly id: bigint,
    public readonly payload: ScheduleOrderDto,
  ) {}
}
