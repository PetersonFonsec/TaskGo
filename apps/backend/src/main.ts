import otelSDK from './tracing';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
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
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  app.enableCors(
    buildCorsOptions({
      nodeEnv: configService.getOrThrow<string>('app.nodeEnv'),
      publicOrigins: configService.get<string>('app.publicOrigins'),
      backofficeOrigins: configService.get<string>('app.backofficeOrigins'),
    }),
  );
  app.use(helmet());
  app.use(requestCorrelationMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          errorCode: 'VALIDATION_ERROR',
          message: errors.flatMap(({ property, constraints }) =>
            Object.keys(constraints ?? {}).map(
              (constraint) => `${property}: ${validationMessage(constraint)}`,
            ),
          ),
        }),
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
  SwaggerModule.setup('api', app, document);

  await app.listen(configService.getOrThrow<number>('app.port'));
}

function validationMessage(constraint: string): string {
  const messages: Record<string, string> = {
    isNotEmpty: 'este campo é obrigatório.',
    isDefined: 'este campo é obrigatório.',
    isEmail: 'informe um e-mail válido.',
    isString: 'informe um texto válido.',
    isNumber: 'informe um número válido.',
    isInt: 'informe um número inteiro.',
    isEnum: 'selecione uma opção válida.',
    isIn: 'selecione uma opção válida.',
    isBoolean: 'informe uma opção válida.',
    isArray: 'informe uma lista válida.',
    isObject: 'informe um objeto válido.',
    isUUID: 'informe um identificador válido.',
    isISO8601: 'informe uma data válida.',
    isLatitude: 'informe uma latitude válida.',
    isLongitude: 'informe uma longitude válida.',
    isMobilePhone: 'informe um telefone válido.',
    isPositive: 'informe um número maior que zero.',
    min: 'o valor está abaixo do mínimo permitido.',
    max: 'o valor ultrapassa o máximo permitido.',
    minLength: 'o texto é menor que o tamanho mínimo permitido.',
    maxLength: 'o texto ultrapassa o tamanho máximo permitido.',
    length: 'o texto não tem o tamanho permitido.',
    matches: 'o formato informado é inválido.',
    isEmpty: 'este campo não pode ser preenchido.',
  };
  return messages[constraint] ?? 'o valor informado é inválido.';
}

bootstrap();
