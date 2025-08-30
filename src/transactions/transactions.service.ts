import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionsRepository } from './transactions.repository';
import { UsersRepository } from '../users/users.repository';
import { Transaction } from './transaction.entity';
import { FraudService } from '../fraud/fraud.service';

interface CreateTxInput {
  transaction_id: string;
  user_id: string;
  amount: string; // centavos
  type: 'deposit' | 'withdraw';
  timestamp: string; // ISO8601
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  constructor(
    private readonly txRepo: TransactionsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly ds: DataSource,
    private readonly fraud: FraudService,
  ) {}

  async create(input: CreateTxInput): Promise<Transaction> {
    console.log('create', input);
    const amountCents = Number(input.amount);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new BadRequestException(
        'amount debe ser entero positivo en centavos',
      );
    }

    const existing = await this.txRepo.findOne({
      where: { transactionId: input.transaction_id },
    });
    if (existing) return existing;

    return await this.ds.transaction('SERIALIZABLE', async (manager) => {
      const user = await manager
        .getRepository('User')
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :userId', { userId: input.user_id })
        .getOne();

      if (!user) {
        await manager.query(
          'INSERT INTO users(id, balance_cents) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [input.user_id, 0],
        );
      }

      const row = await manager
        .getRepository('User')
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :userId', { userId: input.user_id })
        .getOne();

      if (!row) throw new NotFoundException('User not found after creation');

      const current = Number(row.balanceCents);
      const next =
        input.type === 'deposit'
          ? current + amountCents
          : current - amountCents;
      if (next < 0) throw new BadRequestException('Fondos insuficientes');

      // actualizar saldo
      await manager
        .createQueryBuilder()
        .update('users')
        .set({ balanceCents: String(next) })
        .where('id = :id', { id: input.user_id })
        .execute();

      const tx = manager.getRepository(Transaction).create({
        transactionId: input.transaction_id,
        userId: input.user_id,
        amountCents: String(amountCents),
        type: input.type,
        occurredAt: new Date(input.timestamp),
      });
      const saved = await manager.getRepository(Transaction).save(tx);

      const recent = await this.txRepo.find({
        where: { userId: input.user_id },
        order: { createdAt: 'DESC' },
        take: 10,
      });
      void this.fraud.evaluateRecent(
        recent.map((r) => ({
          userId: r.userId,
          amountCents: Number(r.amountCents),
          type: r.type,
          occurredAt: r.occurredAt,
        })),
      );

      this.logger.log(
        `TX ${input.type} ${amountCents} user=${input.user_id} ok`,
      );
      return saved;
    });
  }

  async getHistory(
    userId: string,
    from?: Date,
    to?: Date,
    limit = 50,
    offset = 0,
  ) {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId });
    if (from) qb.andWhere('t.created_at >= :from', { from });
    if (to) qb.andWhere('t.created_at < :to', { to });
    return qb
      .orderBy('t.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return Number(user.balanceCents) / 100;
  }
}
