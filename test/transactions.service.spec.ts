import { TransactionsService } from '../src/transactions/transactions.service';
// Mock repos y fraud service para probar reglas de dominio

describe('TransactionsService', () => {
  it('rechaza retiros si saldo insuficiente', async () => {
    // arrange: usuario con 1000
    // act: withdraw 2000
    // assert: BadRequestException
  });
});
