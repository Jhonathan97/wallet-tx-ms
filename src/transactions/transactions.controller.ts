import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  history(@Param('userId') userId: string, @Query() q: QueryTransactionsDto) {
    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    const limit = q.limit ? Number(q.limit) : 50;
    const offset = q.offset ? Number(q.offset) : 0;
    return this.service.getHistoryByExternalId(userId, from, to, limit, offset);
  }

  @Get(':userId/balance')
  getBalance(@Param('userId') userId: string) {
    return this.service.getBalanceByExternalId(userId);
  }
}
