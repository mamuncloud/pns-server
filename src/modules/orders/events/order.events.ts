export class OrderReadyEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerName: string,
    public readonly customerPhone: string,
  ) {}
}

export const ORDER_EVENTS = {
  READY: 'order.ready',
};
