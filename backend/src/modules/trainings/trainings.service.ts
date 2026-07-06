import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Training } from './training.entity';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
} from './dto/training.dto';

@Injectable()
export class TrainingsService {
  constructor(
    @InjectRepository(Training)
    private readonly trainingsRepo: Repository<Training>,
  ) {}

  /** Priloži uporabnika brez občutljivih polj. */
  private sanitizeUser(training: Training): Training {
    if (training.user) {
      training.user = {
        id: training.user.id,
        firstName: training.user.firstName,
        lastName: training.user.lastName,
        membershipStatus: training.user.membershipStatus,
      } as any;
    }
    return training;
  }

  async create(
    organizationId: string,
    dto: CreateTrainingDto,
  ): Promise<Training> {
    if (dto.expiresAt && dto.expiresAt < dto.completedAt) {
      throw new BadRequestException(
        'Datum poteka ne more biti pred datumom opravljanja.',
      );
    }
    const training = this.trainingsRepo.create({ ...dto, organizationId });
    return this.trainingsRepo.save(training);
  }

  /** Vsa usposabljanja organizacije — za vodstvo. */
  async findAll(organizationId: string): Promise<Training[]> {
    const trainings = await this.trainingsRepo.find({
      where: { organizationId },
      relations: { user: true },
      order: { expiresAt: 'ASC' },
    });
    return trainings.map((t) => this.sanitizeUser(t));
  }

  /** Usposabljanja enega člana. */
  async findByUser(
    organizationId: string,
    userId: string,
  ): Promise<Training[]> {
    return this.trainingsRepo.find({
      where: { organizationId, userId },
      order: { completedAt: 'DESC' },
    });
  }

  /** Potekajoča usposabljanja v naslednjih N dneh — za opomnike/dashboard. */
  async findExpiring(organizationId: string, days = 60): Promise<Training[]> {
    const trainings = await this.trainingsRepo
      .createQueryBuilder('training')
      .leftJoinAndSelect('training.user', 'user')
      .where('training.organizationId = :organizationId', { organizationId })
      .andWhere('training.expires_at IS NOT NULL')
      .andWhere('training.expires_at <= CURRENT_DATE + :days::int', { days })
      .orderBy('training.expires_at', 'ASC')
      .getMany();
    return trainings.map((t) => this.sanitizeUser(t));
  }

  async findOne(organizationId: string, id: string): Promise<Training> {
    const training = await this.trainingsRepo.findOne({
      where: { id, organizationId },
    });
    if (!training) {
      throw new NotFoundException('Usposabljanje ni bilo najdeno.');
    }
    return training;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateTrainingDto,
  ): Promise<Training> {
    const training = await this.findOne(organizationId, id);

    const completedAt = dto.completedAt ?? training.completedAt;
    const expiresAt = dto.expiresAt ?? training.expiresAt;
    if (expiresAt && expiresAt < completedAt) {
      throw new BadRequestException(
        'Datum poteka ne more biti pred datumom opravljanja.',
      );
    }

    Object.assign(training, dto);
    return this.trainingsRepo.save(training);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const training = await this.findOne(organizationId, id);
    await this.trainingsRepo.remove(training);
  }
}
