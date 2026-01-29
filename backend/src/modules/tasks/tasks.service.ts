import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { TaskHistory } from './entities/task-history.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskHistory)
    private readonly taskHistoryRepository: Repository<TaskHistory>,
  ) {}

  async create(createTaskDto: CreateTaskDto, createdById: string): Promise<Task> {
    const task = this.taskRepository.create({
      ...createTaskDto,
      assignedBy: createdById,
      priority: createTaskDto.priority || 'MEDIUM',
      urgency: createTaskDto.urgency || 'MEDIUM',
    });

    const savedTask = await this.taskRepository.save(task);

    // Create history entry
    await this.createHistoryEntry(
      savedTask.id,
      'CREATED',
      null,
      null,
      null,
      createdById,
    );

    return this.findOne(savedTask.id);
  }

  async findAll(filters?: {
    status?: TaskStatus;
    priority?: string;
    assignedToId?: string;
    createdById?: string;
  }): Promise<Task[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedToUser', 'assignedToUser')
      .leftJoinAndSelect('task.assignedByUser', 'assignedByUser')
      .orderBy('task.created_at', 'DESC');

    if (filters?.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters?.assignedToId) {
      query.andWhere('task.assigned_to = :assignedToId', {
        assignedToId: filters.assignedToId,
      });
    }

    if (filters?.createdById) {
      query.andWhere('task.assigned_by = :createdById', {
        createdById: filters.createdById,
      });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignedToUser', 'assignedByUser', 'department', 'history', 'history.changedByUser'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(id);

    // Track changes for history
    const changes: Array<{
      field: string;
      oldValue: string;
      newValue: string;
    }> = [];

    Object.keys(updateTaskDto).forEach((key) => {
      const oldValue = task[key];
      const newValue = updateTaskDto[key];

      if (oldValue !== newValue && newValue !== undefined) {
        changes.push({
          field: key,
          oldValue: oldValue?.toString() || null,
          newValue: newValue?.toString() || null,
        });
      }
    });

    // Update task
    Object.assign(task, updateTaskDto);

    // Update completed_at when status changes to COMPLETED
    if (updateTaskDto.status === TaskStatus.COMPLETED && !task.completedAt) {
      task.completedAt = new Date();
    }

    const updatedTask = await this.taskRepository.save(task);

    // Create history entries for each change
    for (const change of changes) {
      await this.createHistoryEntry(
        id,
        'UPDATED',
        change.field,
        change.oldValue,
        change.newValue,
        userId,
      );
    }

    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id);

    await this.createHistoryEntry(id, 'DELETED', null, null, null, userId);

    await this.taskRepository.remove(task);
  }

  async getTaskHistory(id: string): Promise<TaskHistory[]> {
    const task = await this.findOne(id);

    return this.taskHistoryRepository.find({
      where: { taskId: task.id },
      relations: ['changedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  private async createHistoryEntry(
    taskId: string,
    action: string,
    field: string | null,
    oldValue: string | null,
    newValue: string | null,
    changedById: string,
  ): Promise<void> {
    const history = this.taskHistoryRepository.create({
      taskId,
      changeType: action,
      fieldName: field,
      oldValue,
      newValue,
      changedBy: changedById,
    });

    await this.taskHistoryRepository.save(history);
  }
}
