export class PaymentSatisfiedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerName: string,
    public readonly customerPhone: string,
    public readonly amount: number,
  ) {}
}

export const PAYMENT_EVENTS = {
  SATISFIED: 'payment.satisfied',
};
