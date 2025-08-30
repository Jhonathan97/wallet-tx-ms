import * as request from 'supertest';


describe('Transactions (e2e)', () => {
it('/transactions (POST) crea depósito y actualiza saldo', async () => {
const res = await request('http://localhost:3000')
.post('/api/transactions')
.send({ transaction_id: 't1', user_id: '1', amount: '500', type: 'deposit', timestamp: new Date().toISOString() })
.expect(201);
});
});