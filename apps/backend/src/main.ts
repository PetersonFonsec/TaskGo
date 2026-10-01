import otelSDK from './tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import helmet from 'helmet';
// import * as compression from 'compression';

import { AppModule } from './app.module';
import { buildCorsOptions } from './config/cors.config';
import { CustomExceptionFilter } from './shared/filters/http-exception.filter';
import { requestCorrelationMiddleware } from './shared/http/request-correlation.middleware';

async function bootstrap() {
  await otelSDK.start();
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors(
    buildCorsOptions({
      nodeEnv: configService.getOrThrow<string>('app.nodeEnv'),
      publicOrigins: configService.get<string>('app.publicOrigins'),
      backofficeOrigins: configService.get<string>('app.backofficeOrigins'),
    }),
  );
  app.use(helmet());
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      configService
        .get<string>('TRUST_PROXY_CIDRS')
        ?.split(',')
        .map((value) => value.trim())
        .filter(Boolean) ?? false,
    );
  app.use(requestCorrelationMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new CustomExceptionFilter());
  // app.use(compression());

  const config = new DocumentBuilder()
    .setTitle('TaskGo backend')
    .setDescription('The TaskGo backend API documentation')
    .setVersion('1.0')
    .addTag('TaskGo')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  if (configService.get('app.nodeEnv') !== 'production')
    SwaggerModule.setup('api', app, document);

  await app.listen(configService.getOrThrow<number>('app.port'));
}

bootstrap();
