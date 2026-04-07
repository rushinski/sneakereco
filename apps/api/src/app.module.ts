import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { envSchema } from './config/env.schema';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './common/database/database.module';
import { JwtAuthGuard } from './common/guards/auth.guard';
import { OnboardingOriginGuard } from './common/guards/onboarding-origin.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { OriginResolverService } from './common/middleware/origin-resolver.service';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FeaturedModule } from './modules/featured/featured.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { HealthModule } from './modules/health/health.module';
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
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    CommonModule,
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
    CommunicationsModule,
    AddressesModule,
    FeaturedModule,
  ],
  providers: [
    OriginResolverService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: OnboardingOriginGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, CorsMiddleware, CsrfMiddleware).forRoutes('*');
  }
}
