import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Extra allowed origins for deployed frontends, comma-separated, e.g.
  // CORS_ORIGINS="https://heliora-web.fly.dev,https://heliora-admin.fly.dev"
  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3002',
      ...configuredOrigins,
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Heliora API')
    .setDescription('Sci-fi idle RPG API for Hibaro-5')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  // Bind all interfaces so the app is reachable inside a container (Fly, etc.)
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Heliora API running on port ${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
