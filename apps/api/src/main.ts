import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { initSentry } from './instrumentation';

async function bootstrap() {
  await initSentry();

  const isProduction = process.env.NODE_ENV === 'production';
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? ['error', 'warn', 'log'] : undefined,
    rawBody: true,
  });

  if (isProduction) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(
    compression({
      threshold: 1024,
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3010',
    'http://localhost:3011',
    'http://localhost:3012',
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Reject without throwing — throwing surfaces as opaque 500 / Failed to fetch in browsers.
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Razorpay-Signature',
      'X-Tenant-Id',
      'X-Tenant-Slug',
    ],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining', 'X-Response-Time', 'Server-Timing'],
    maxAge: 86400,
  });

  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('FitOra API')
      .setDescription('FitOra sports & fitness platform REST API.')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
      customSiteTitle: 'FitOra API Docs',
    });
  }

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(
    JSON.stringify({
      event: 'server_started',
      port,
      env: process.env.NODE_ENV ?? 'development',
      swagger: swaggerEnabled,
    }),
  );
}

bootstrap();
