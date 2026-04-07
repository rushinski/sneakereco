import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './common/database/database.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { JwtAuthGuard } from './common/guards/auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { TaxModule } from './modules/tax/tax.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { FeaturedModule } from './modules/featured/featured.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Config — loaded first, available everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // Logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),

    // Database — global, must come before feature modules
    DatabaseModule,

    // Feature modules
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
    // Order matters: JWT runs first (populates request.user),
    // then TenantGuard reads request.user and sets tenant context.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
