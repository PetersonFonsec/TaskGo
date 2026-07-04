import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrderModule } from './modules/order/order.module';
import { AddressModule } from './modules/address/address.module';
import { ServicesModule } from './modules/services/services.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProviderModule } from './modules/provider/provider.module';
import { AuthGuard } from './modules/auth/auth.guard';
import { FeatureFlagModule } from './feature-flag/feature-flag.module';
import { BigIntInterceptor } from './shared/interceptors/bigint.interceptor';
import { ReviewTagModule } from './modules/review-tag/review-tag.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    OrderModule,
    AddressModule,
    ServicesModule,
    CategoriesModule,
    ProviderModule,
    FeatureFlagModule,
    ReviewTagModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BigIntInterceptor,
    },
  ],
})
export class AppModule {}
