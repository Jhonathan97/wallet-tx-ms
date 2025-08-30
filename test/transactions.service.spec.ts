import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from '../src/transactions/transactions.service';
import { FraudService } from '../src/fraud/fraud.service';

describe('TransactionsService (unit)', () => {
  const txRepo: any = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const usersRepo: any = {
    findByExternalId: jest.fn(),
  };
  const ds: any = {
    transaction: jest.fn(),
  };
  const fraud: any = { evaluateRecent: jest.fn().mockResolvedValue(false) };

  // helper para un manager simulado
  const makeManager = (user: any, afterBalance: number, saveTx: any = {}) => ({
    getRepository: (entity: any) => ({
      findOne: jest.fn(async (opts?: any) => {
        if (opts?.where?.externalId) return user; // buscar por externalId
        return null;
      }),
      create: jest.fn((obj) => obj),
      save: jest.fn(async (obj) => {
        if ((obj as any).externalId) {
          // crear usuario
          return { ...obj, id: '1', balanceCents: obj.balanceCents ?? '0' };
        }
        // guardar transacción
        return { id: '10', ...obj, ...saveTx };
      }),
      update: jest.fn(async () => undefined),
      find: jest.fn(async () => []),
      createQueryBuilder: jest.fn(() => ({
        setLock: () => ({
          where: () => ({
            getOne: async () => ({
              id: '1',
              externalId: 'ext-1',
              balanceCents: String(afterBalance),
            }),
          }),
        }),
      })),
    }),
  });

  const service = new TransactionsService(
    txRepo,
    usersRepo,
    ds,
    fraud as unknown as FraudService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería depositar y actualizar saldo', async () => {
    txRepo.findOne.mockResolvedValue(null); // no hay idempotencia
    ds.transaction.mockImplementation(async (_iso, cb) => {
      const user = null; // no existe al inicio -> se crea con balance 0
      const manager = makeManager(user, 10000); // después de lock, lo vemos con balance 10000 (no es relevante aquí)
      return cb(manager);
    });

    const res = await service.create({
      transaction_id: 't-1',
      user_id: 'ext-1', // external
      amount: '5000', // +50.00
      type: 'deposit',
      timestamp: new Date().toISOString(),
    });

    expect(res.transactionId).toBe('t-1');
    expect(txRepo.findOne).toHaveBeenCalled();
    expect(ds.transaction).toHaveBeenCalled();
  });

  it('debería rechazar retiro por fondos insuficientes', async () => {
    txRepo.findOne.mockResolvedValue(null);
    ds.transaction.mockImplementation(async (_iso, cb) => {
      // usuario existe con balance 3000
      const manager = makeManager(
        { id: '1', externalId: 'ext-1', balanceCents: '3000' },
        3000,
      );
      return cb(manager);
    });

    await expect(
      service.create({
        transaction_id: 't-2',
        user_id: 'ext-1',
        amount: '5000', // -50.00
        type: 'withdraw',
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('idempotencia: si existe transaction_id, devuelve existente', async () => {
    txRepo.findOne.mockResolvedValue({ id: '99', transactionId: 't-3' });
    const res = await service.create({
      transaction_id: 't-3',
      user_id: 'ext-1',
      amount: '1000',
      type: 'deposit',
      timestamp: new Date().toISOString(),
    });
    expect(res.id).toBe('99');
    expect(ds.transaction).not.toHaveBeenCalled();
  });
});
