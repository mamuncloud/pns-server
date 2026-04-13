export class PaymentSatisfiedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerName: string,
    public readonly customerPhone: string,
    public readonly amount: number,
  ) {}
}

export class PaymentLinkGeneratedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerName: string,
    public readonly customerPhone: string,
    public readonly amount: number,
    public readonly paymentUrl: string,
  ) {}
}

export const PAYMENT_EVENTS = {
  SATISFIED: 'payment.satisfied',
  LINK_GENERATED: 'payment.link_generated',
};
