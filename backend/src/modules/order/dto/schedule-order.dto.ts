import { IsISO8601 } from 'class-validator';

export class ScheduleOrderDto {
  @IsISO8601()
  scheduledFor!: string; // ISO string
}
