import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TrainingController } from '../../src/training/training.controller';
import { TrainingService } from '../../src/training/training.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

const KID_ID = '33333333-3333-4333-8333-333333333333';
const BATCH_ID = '44444444-4444-4444-8444-444444444444';
const LISTING_ID = '55555555-5555-4555-8555-555555555555';

describe('Training API (integration)', () => {
  let app: INestApplication;
  const trainingService = {
    getAgeGroupPresets: jest.fn(),
    getTrainers: jest.fn(),
    getPrograms: jest.fn(),
    getProgram: jest.fn(),
    createProgram: jest.fn(),
    updateProgram: jest.fn(),
    createBatch: jest.fn(),
    updateBatch: jest.fn(),
    assignTrainer: jest.fn(),
    createKid: jest.fn(),
    updateKid: jest.fn(),
    getMyKids: jest.fn(),
    enroll: jest.fn(),
    enrollWithKid: jest.fn(),
    markAttendance: jest.fn(),
    markBatchAttendance: jest.fn(),
    createProgressReport: jest.fn(),
    getParentDashboard: jest.fn(),
    getTrainerDashboard: jest.fn(),
    listEnrollments: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [TrainingController],
      providers: [{ provide: TrainingService, useValue: trainingService }],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('GET /api/v1/training/age-groups is public', async () => {
    trainingService.getAgeGroupPresets.mockReturnValue([{ label: 'Juniors', minAge: 9, maxAge: 12 }]);

    const res = await request(app.getHttpServer()).get('/api/v1/training/age-groups').expect(200);

    expect(res.body[0].label).toBe('Juniors');
  });

  it('GET /api/v1/training/programs lists programs', async () => {
    trainingService.getPrograms.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/api/v1/training/programs').expect(200);
  });

  it('POST /api/v1/training/kids creates kid profile', async () => {
    trainingService.createKid.mockResolvedValue({ id: 'kid-1', firstName: 'Riya' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/training/kids')
      .set('x-test-role', 'player')
      .send({
        firstName: 'Riya',
        lastName: 'Kumar',
        dateOfBirth: '2016-05-01',
        gender: 'FEMALE',
        emergencyContact: 'Parent Kumar',
        emergencyPhone: '9999999999',
      })
      .expect(201);

    expect(res.body.firstName).toBe('Riya');
  });

  it('POST /api/v1/training/enroll enrolls kid in batch', async () => {
    trainingService.enroll.mockResolvedValue({
      enrollment: { id: 'enroll-1' },
      payment: { paymentId: 'pay-1' },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/training/enroll')
      .set('x-test-role', 'player')
      .send({ kidId: KID_ID, batchId: BATCH_ID })
      .expect(201);

    expect(res.body.enrollment.id).toBe('enroll-1');
  });

  it('GET /api/v1/training/dashboard/parent returns parent stats', async () => {
    trainingService.getParentDashboard.mockResolvedValue({ kids: [], enrollments: [] });

    await request(app.getHttpServer())
      .get('/api/v1/training/dashboard/parent')
      .set('x-test-role', 'player')
      .expect(200);
  });
});
