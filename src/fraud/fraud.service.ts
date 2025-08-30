import { Injectable, Logger } from '@nestjs/common';

interface TxLike {
  userId: string;
  amountCents: number;
  type: 'deposit' | 'withdraw';
  occurredAt: Date;
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  // Regla básica: N transacciones consecutivas > THRESHOLD en WINDOW minutos
  private readonly THRESHOLD = 200_00; // $200.00
  private readonly MAX_COUNT = 3;
  private readonly WINDOW_MIN = 5;

  evaluateRecent(txns: TxLike[]): boolean {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.WINDOW_MIN * 60_000);
    const recent = txns.filter(
      (t) => t.occurredAt >= windowStart && t.amountCents >= this.THRESHOLD,
    );
    const suspicious = recent.length >= this.MAX_COUNT;
    if (suspicious) {
      this.logger.warn(
        `ALERTA FRAUDE user=${txns[0]?.userId} count=${recent.length} window=${this.WINDOW_MIN}m`,
      );
    }
    return suspicious;
  }
}
