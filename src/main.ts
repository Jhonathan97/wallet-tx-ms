import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger} from 'nestjs-pino';
import fastifyStatic from '@fastify/static';


async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: ['error', 'warn', 'log', 'verbose', 'debug'] },
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Wallet Transactions API')
    .setDescription(
      'Microservice API para procesar transacciones (deposit/withdraw)',
    )
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  const port = parseInt( process.env.PORT ?? '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
  app.useLogger(app.get(Logger));
  //app.log(`Listening on ${await app.getUrl()}`);
}
bootstrap();
