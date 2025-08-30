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
import { User } from 'src/users/user.entity';

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
  ) { }

  async create(input: CreateTxInput): Promise<Transaction> {
    this.logger.debug(`create payload tx=${input.transaction_id} user=${input.user_id}`);
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
      let user = await manager
        .getRepository('User')
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :userId', { userId: input.user_id })
        .getOne();

      if (!user) {
        user = manager.getRepository(User).create({
          externalId: input.user_id,
          balanceCents: '0',
        })
        await manager.getRepository(User).save(user);
        user = await manager
          .getRepository(User)
          .createQueryBuilder('u')
          .setLock('pessimistic_write')
          .where('u.id = :userId', { userId: user.id })
          .getOne();
      }

      if (!user) throw new NotFoundException('User not found after creation');

      const current = Number(user.balanceCents);
      const next =
        input.type === 'deposit'
          ? current + amountCents
          : current - amountCents;

      if (next < 0) {
        this.logger.warn(
          `Fondos insuficientes tx=${input.transaction_id} user=${input.user_id} current=${current} withdraw=${amountCents}`,
        );
        throw new BadRequestException('Fondos insuficientes')
      };

      await manager.getRepository(User).update(
        { id: user.id },
        { balanceCents: String(next) },
      );

      const tx = manager.getRepository(Transaction).create({
        transactionId: input.transaction_id,
        userId: user.id,
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
        `OK tx=${input.transaction_id} extUser=${input.user_id} type=${input.type} amount=${amountCents} newBalance=${next}`,
      );
      return saved;
    });
  }

  async getHistoryByExternalId(
    externalId: string,
    from?: Date,
    to?: Date,
    limit = 50,
    offset = 0,
  ) {
    const user = await this.usersRepo.findByExternalId(externalId);
    if(!user) throw new NotFoundException('User not found');
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId: user.id });
    if (from) qb.andWhere('t.created_at >= :from', { from });
    if (to) qb.andWhere('t.created_at < :to', { to });
    return qb
      .orderBy('t.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  async getBalanceByExternalId(userId: string): Promise<number> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return Number(user.balanceCents) / 100;
  }
}
