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
    const avatar = `https://cdn.example.com/avatars/${uniqueSuffix}.png`;
    const password = 'password123';

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username, email, avatar, password })
      .expect(201);

    expect(registerResponse.body.user.email).toBe(email);
    expect(registerResponse.body.user.username).toBe(username);
    expect(registerResponse.body.user.avatar).toBe(avatar);
    expect(registerResponse.body.user.roles).toHaveLength(1);
    expect(registerResponse.body.access_token).toEqual(expect.any(String));

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(loginResponse.body.user.email).toBe(email);
    expect(loginResponse.body.user.username).toBe(username);
    expect(loginResponse.body.user.avatar).toBe(avatar);
    expect(loginResponse.body.access_token).toEqual(expect.any(String));
    expect(loginResponse.body.refresh_token).toEqual(expect.any(String));

    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
      .expect(200);

    expect(profileResponse.body.email).toBe(email);
    expect(profileResponse.body.username).toBe(username);
    expect(profileResponse.body.avatar).toBe(avatar);
    expect(profileResponse.body.password).toBeUndefined();

    const refreshedSession = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginResponse.body.refresh_token })
      .expect(201);

    expect(refreshedSession.body.access_token).toEqual(expect.any(String));
    expect(refreshedSession.body.refresh_token).toEqual(expect.any(String));
    expect(refreshedSession.body.refresh_token).not.toBe(
      loginResponse.body.refresh_token,
    );

    const sessionsResponse = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${refreshedSession.body.access_token}`)
      .expect(200);

    expect(sessionsResponse.body.length).toBeGreaterThanOrEqual(1);
    expect(sessionsResponse.body[0].id).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .delete(`/auth/sessions/${sessionsResponse.body[0].id}`)
      .set('Authorization', `Bearer ${refreshedSession.body.access_token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refreshedSession.body.refresh_token })
      .expect(401);
  });

  it('exchanges a trusted Google identity into a Nest access token', async () => {
    const uniqueSuffix = `${Date.now()}-google`;
    const email = `google_${uniqueSuffix}@example.com`;
    const username = `Google User ${Date.now()}`;
    const avatar = `https://cdn.example.com/avatars/google-${Date.now()}.png`;

    const exchangeResponse = await request(app.getHttpServer())
      .post('/auth/exchange')
      .set('x-auth-exchange-secret', 'local-auth-exchange-secret-please-change')
      .send({
        provider: 'google',
        providerAccountId: `google-${uniqueSuffix}`,
        email,
        username,
        avatar,
        emailVerifiedAt: new Date().toISOString(),
      })
      .expect(201);

    expect(exchangeResponse.body.user.email).toBe(email);
    expect(exchangeResponse.body.user.username).toBe(username);
    expect(exchangeResponse.body.user.avatar).toBe(avatar);
    expect(exchangeResponse.body.user.roles).toHaveLength(1);
    expect(exchangeResponse.body.access_token).toEqual(expect.any(String));
    expect(exchangeResponse.body.refresh_token).toEqual(expect.any(String));

    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${exchangeResponse.body.access_token}`)
      .expect(200);

    expect(profileResponse.body.email).toBe(email);
    expect(profileResponse.body.username).toBe(username);
    expect(profileResponse.body.avatar).toBe(avatar);

    const linkedProviders = await request(app.getHttpServer())
      .get('/auth/providers')
      .set('Authorization', `Bearer ${exchangeResponse.body.access_token}`)
      .expect(200);

    expect(linkedProviders.body).toHaveLength(1);
    expect(linkedProviders.body[0].provider).toBe('google');

    const linkedProvider = await request(app.getHttpServer())
      .post('/auth/providers/link')
      .set('Authorization', `Bearer ${exchangeResponse.body.access_token}`)
      .send({
        provider: 'github',
        providerAccountId: `github-${uniqueSuffix}`,
        email,
        username,
        avatar,
        emailVerifiedAt: new Date().toISOString(),
      })
      .expect(201);

    expect(linkedProvider.body.roles).toHaveLength(1);

    const providersAfterLink = await request(app.getHttpServer())
      .get('/auth/providers')
      .set('Authorization', `Bearer ${exchangeResponse.body.access_token}`)
      .expect(200);

    expect(providersAfterLink.body).toHaveLength(2);

    await request(app.getHttpServer())
      .delete(`/auth/providers/github/github-${uniqueSuffix}`)
      .set('Authorization', `Bearer ${exchangeResponse.body.access_token}`)
      .expect(200);

    const providersAfterUnlink = await request(app.getHttpServer())
      .get('/auth/providers')
      .set('Authorization', `Bearer ${exchangeResponse.body.access_token}`)
      .expect(200);

    expect(providersAfterUnlink.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: exchangeResponse.body.refresh_token })
      .expect(201);
  });
});
