import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './domains/auth/auth.module';
import { TenantsModule } from './domains/tenants/tenants.module';
import { ProductsModule } from './domains/products/products.module';
import { OrdersModule } from './domains/orders/orders.module';
import { PaymentsModule } from './domains/payments/payments.module';
import { FraudModule } from './domains/fraud/fraud.module';
import { TaxModule } from './domains/tax/tax.module';
import { ShippingModule } from './domains/shipping/shipping.module';
import { CustomersModule } from './domains/customers/customers.module';
import { CommunicationsModule } from './domains/communications/communications.module';
import { AddressesModule } from './domains/addresses/addresses.module';
import { FeaturedModule } from './domains/featured/featured.module';
import { HealthModule } from './domains/health/health.module';

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
})
export class AppModule {}