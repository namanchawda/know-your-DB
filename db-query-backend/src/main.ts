import 'dotenv/config';
import dns from 'dns';

// 🔥 CRITICAL: fixes Supabase / Postgres hanging
dns.setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: [
      'http://localhost:3001',
      'https://know-your-db.vercel.app',
    ],
  });

  await app.listen(process.env.PORT || 3000);

  keepModelWarm();
}

async function keepModelWarm() {
  setInterval(async () => {
    try {
      await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral:7b-instruct-q4_K_M',
          prompt: 'ping',
          stream: false,
        }),
      });
    } catch {
      // silently ignore
    }
  }, 2 * 60 * 1000);
}

bootstrap();
