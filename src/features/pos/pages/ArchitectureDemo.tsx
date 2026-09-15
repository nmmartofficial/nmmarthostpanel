import React from 'react';
import {
  CartSummary,
  CustomerSummary,
  CheckoutSummary,
  OrderSummary,
  InvoiceSummary,
  PrinterSummary,
  RuntimeSummary,
  ExecutionSummary,
  PersistenceSummary,
  RepositorySummary
} from '../components';
import { CheckoutProvider } from '../checkout';
import { OrderProvider } from '../order';
import { InvoiceProvider } from '../invoice';
import { PrinterProvider } from '../printer';
import { RuntimeProvider } from '../runtime';
import { ExecutionProvider } from '../execution';
import { PersistenceProvider } from '../persistence';
import { RepositoryProvider } from '../repository';
import { CustomerProvider } from '../customer';

const ArchitectureDemoPage = () => {
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        POS Enterprise Architecture Demo
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <CustomerProvider>
          <div>
            <CustomerSummary />
          </div>
        </CustomerProvider>

        <div>
          <CartSummary />
        </div>

        <CheckoutProvider>
          <div>
            <CheckoutSummary />
          </div>
        </CheckoutProvider>

        <OrderProvider>
          <div>
            <OrderSummary />
          </div>
        </OrderProvider>

        <InvoiceProvider>
          <div>
            <InvoiceSummary />
          </div>
        </InvoiceProvider>

        <PrinterProvider>
          <div>
            <PrinterSummary />
          </div>
        </PrinterProvider>

        <RuntimeProvider>
          <div>
            <RuntimeSummary />
          </div>
        </RuntimeProvider>

        <ExecutionProvider>
          <div>
            <ExecutionSummary />
          </div>
        </ExecutionProvider>

        <PersistenceProvider>
          <div>
            <PersistenceSummary />
          </div>
        </PersistenceProvider>

        <RepositoryProvider>
          <div>
            <RepositorySummary />
          </div>
        </RepositoryProvider>
      </div>
    </div>
  );
};

export default ArchitectureDemoPage;
