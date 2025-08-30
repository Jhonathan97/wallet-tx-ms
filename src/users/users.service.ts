import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersRepository } from './users.repository';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly ds: DataSource,
  ) {}

  async getOrCreate(userId: string): Promise<User> {
    let user = await this.repo.findOne({ where: { id: userId } });
    if (!user) {
      user = this.repo.create({ id: userId, balanceCents: '0' });
      await this.repo.save(user);
    }
    return user;
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return Number(user.balanceCents) / 100;
  }
}
