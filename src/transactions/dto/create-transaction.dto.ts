import {
  IsString,
  IsIn,
  IsNotEmpty,
  IsISO8601,
  Matches,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @Matches(/^\d+$/, { message: 'amount debe ser centavos positivos' })
  amount: string;

  @IsIn(['deposit', 'withdraw'])
  type: 'deposit' | 'withdraw';

  @IsISO8601()
  timestamp: string; // ISO8601
}
