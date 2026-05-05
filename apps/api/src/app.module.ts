import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { HealthModule } from '@/core/health/health.module';

import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { LoggingModule } from './core/logging/logging.module';
import { ThrottlingModule } from './core/security/throttling/throttling.module';
import { envSchema } from './config/env.schema';
import { CognitoModule } from './core/cognito/cognito.module';
import { CsrfModule } from './core/security/csrf/csrf.module';
import { ValkeyModule } from './core/valkey/valkey.module';
import { CommonModule } from './common/common.module';
import { RequestContextModule } from './common/context/request-context.module';
import { RequestContextMiddleware } from './common/context/request-context.middleware';
import { DatabaseModule } from './core/database/database.module';
import { AuthGuard } from './common/guards/auth.guard';
import { OnboardingOriginGuard } from './common/guards/onboarding-origin.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactModule } from './modules/communications/contact/contact.module';
import { EmailModule } from './modules/communications/email/email.module';
import { ListenersModule } from './modules/communications/listeners/listeners.module';
import { SubscribersModule } from './modules/communications/subscribers/subscribers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FeaturedModule } from './modules/featured/featured.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { TaxModule } from './modules/tax/tax.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          const formatted = result.error.issues
            .map((i) => `  ${i.path.join('.')}: ${i.message}`)
            .join('\n');
          throw new Error(`Config validation failed:\n${formatted}`);
        }
        return result.data;
      },
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('VALKEY_URL') },
      }),
    }),

    EventEmitterModule.forRoot({ wildcard: false }),
    ThrottlingModule,
    LoggingModule,
    ValkeyModule,
    CognitoModule,
    CsrfModule,
    CommonModule,
    RequestContextModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    FraudModule,
    TaxModule,
    ShippingModule,
    CustomersModule,
    EmailModule,
    ContactModule,
    SubscribersModule,
    ListenersModule,
    AddressesModule,
    FeaturedModule,
  ],
  providers: [
    // Guard order matters: auth → tenant → roles → throttle → onboarding
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_GUARD, useClass: OnboardingOriginGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestContextMiddleware).forRoutes('*');
  }
}
