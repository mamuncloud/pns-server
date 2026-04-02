import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { eq, like } from 'drizzle-orm';
import { MailsService } from '../mails/mails.service';

@Injectable()
export class EmployeesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly mailsService: MailsService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    // Check for existing email in employees array
    const existingEmployee = await this.db.query.employees.findFirst({
      where: eq(schema.employees.email, createEmployeeDto.email),
    });

    if (existingEmployee) {
      throw new ConflictException('Email sudah terdaftar');
    }

    if (createEmployeeDto.phone) {
      const existingPhone = await this.db.query.employees.findFirst({
        where: eq(schema.employees.phone, createEmployeeDto.phone),
      });

      if (existingPhone) {
        throw new ConflictException('Nomor WhatsApp sudah terdaftar');
      }
    }

    const [newEmployee] = await this.db.insert(schema.employees).values({
      name: createEmployeeDto.name,
      email: createEmployeeDto.email,
      phone: createEmployeeDto.phone,
      role: createEmployeeDto.role,
    }).returning();

    // Fire & Forget welcome email
    this.mailsService.sendWelcomeEmail(newEmployee.email, newEmployee.name).catch(console.error);

    return newEmployee;
  }

  async findAll(search?: string) {
    if (search) {
      return this.db.query.employees.findMany({
        where: like(schema.employees.name, `%${search}%`),
        orderBy: (employees, { desc }) => [desc(employees.createdAt)],
      });
    }
    return this.db.query.employees.findMany({
      orderBy: (employees, { desc }) => [desc(employees.createdAt)],
    });
  }

  async findOne(id: string) {
    const employee = await this.db.query.employees.findFirst({
      where: eq(schema.employees.id, id),
    });

    if (!employee) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);

    // If changing email, ensure it doesn't conflict
    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmail = await this.db.query.employees.findFirst({
        where: eq(schema.employees.email, updateEmployeeDto.email),
      });

      if (existingEmail) {
        throw new ConflictException('Email sudah terdaftar untuk pengguna lain');
      }
    }

    // If changing phone, ensure it doesn't conflict
    if (updateEmployeeDto.phone && updateEmployeeDto.phone !== employee.phone) {
      const existingPhone = await this.db.query.employees.findFirst({
        where: eq(schema.employees.phone, updateEmployeeDto.phone),
      });

      if (existingPhone) {
        throw new ConflictException('Nomor WhatsApp sudah terdaftar untuk pengguna lain');
      }
    }

    const [updatedEmployee] = await this.db.update(schema.employees)
      .set(updateEmployeeDto)
      .where(eq(schema.employees.id, id))
      .returning();

    return updatedEmployee;
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    await this.db.delete(schema.employees).where(eq(schema.employees.id, id));

    return { message: 'Pegawai berhasil dihapus', id: employee.id };
  }
}
