import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { LoggerModule } from 'nestjs-pino';

import { envSchema } from './config/env.schema';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './common/database/database.module';
import { JwtAuthGuard } from './common/guards/auth.guard';
import { OnboardingOriginGuard } from './common/guards/onboarding-origin.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
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

    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.getOrThrow<string>('LOG_LEVEL'),
          transport:
            config.getOrThrow<string>('NODE_ENV') === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
          // Attach requestId to every log line automatically
          customProps: (req) => ({
            requestId: req.headers['x-request-id'],
          }),
        },
      }),
    }),

    // Rate limiting — tiered profiles; override per-route with @Throttle().
    // State is persisted in Valkey so limits survive restarts and work across
    // multiple API instances (PM2 cluster, future horizontal scaling).
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          // Auth endpoints — tightest limits to slow brute-force attacks
          { name: 'auth', ttl: 60_000, limit: 5 },
          // Checkout — prevent cart/order flooding
          { name: 'checkout', ttl: 60_000, limit: 10 },
          // Storefront reads — generous limit for browsing
          { name: 'api-read', ttl: 60_000, limit: 120 },
          // Mutations (admin writes, cart updates, etc.)
          { name: 'api-write', ttl: 60_000, limit: 60 },
          // Inbound webhooks (PayRilla, Shippo)
          { name: 'webhook', ttl: 60_000, limit: 100 },
        ],
        storage: new ThrottlerStorageRedisService(config.getOrThrow<string>('VALKEY_URL')),
      }),
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
    // Guard order matters: auth → tenant → roles → throttle → onboarding
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_GUARD, useClass: OnboardingOriginGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, CorsMiddleware)
      .forRoutes('*');
    // CSRF protection is applied as Express middleware in main.ts via
    // csrf-csrf's doubleCsrfProtection, which must run after cookie-parser.
  }
}
