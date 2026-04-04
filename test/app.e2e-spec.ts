import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    const prismaService = app.get(PrismaService);
    await prismaService.$disconnect();
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('registers, logs in, and returns the authenticated profile', async () => {
    const uniqueSuffix = Date.now().toString();
    const username = `Jane Tester ${uniqueSuffix}`;
    const email = `user_${uniqueSuffix}@example.com`;
    const password = 'password123';

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username, email, password })
      .expect(201);

    expect(registerResponse.body.user.email).toBe(email);
    expect(registerResponse.body.user.username).toBe(username);
    expect(registerResponse.body.user.roles).toHaveLength(1);
    expect(registerResponse.body.access_token).toEqual(expect.any(String));

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(loginResponse.body.user.email).toBe(email);
    expect(loginResponse.body.user.username).toBe(username);
    expect(loginResponse.body.access_token).toEqual(expect.any(String));

    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
      .expect(200);

    expect(profileResponse.body.email).toBe(email);
    expect(profileResponse.body.username).toBe(username);
    expect(profileResponse.body.password).toBeUndefined();
  });
});
