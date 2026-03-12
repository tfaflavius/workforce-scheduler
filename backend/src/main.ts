import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { GlobalUuidValidationPipe } from './common/pipes/uuid-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Security headers (X-Frame-Options, HSTS, X-Content-Type-Options, etc.)
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Enable CORS
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global exception filter — catches all unhandled errors, prevents stack trace leaks
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global pipes — UUID validation for :id params + DTO validation
  app.useGlobalPipes(
    new GlobalUuidValidationPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  // Swagger API Documentation (available at /api/docs)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Workforce Scheduler API')
    .setDescription('API pentru gestionarea programelor, concediilor, parcărilor și resurselor umane')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addTag('Auth', 'Autentificare si gestionare sesiuni')
    .addTag('Users', 'Gestionare utilizatori')
    .addTag('Schedules', 'Programe de lucru')
    .addTag('Leave Requests', 'Cereri de concediu')
    .addTag('Shift Swaps', 'Schimburi de ture')
    .addTag('Tasks', 'Task-uri si sarcini')
    .addTag('Time Tracking', 'Pontaj si GPS tracking')
    .addTag('Daily Reports', 'Rapoarte zilnice')
    .addTag('Notifications', 'Notificari in-app si push')
    .addTag('Reports', 'Rapoarte si export PDF/Excel')
    .addTag('Parking', 'Module parcari (probleme, prejudicii, handicap, domiciliu)')
    .addTag('Acquisitions', 'Achizitii')
    .addTag('Permissions', 'Permisiuni, fluxuri si configurari')
    .addTag('Admin', 'Dashboard si cautare admin')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
