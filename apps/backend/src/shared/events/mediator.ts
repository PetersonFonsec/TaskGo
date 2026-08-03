import { Injectable } from '@nestjs/common';

@Injectable()
export default class Mediator {
  #observer: { event: string; callback: (data: unknown) => unknown }[];

  constructor() {
    this.#observer = [];
  }

  on(event: string, callback: (data: unknown) => unknown) {
    this.#observer.push({ event, callback });
  }

  async publish(event: string, data: any) {
    for (const observer of this.#observer) {
      if (observer.event === event) await observer.callback(data);
    }
  }
}
