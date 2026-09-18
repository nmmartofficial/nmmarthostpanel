import { CustomerService as DatabaseCustomerService } from '../customer/services/customer.service';

export const CustomerService = {
  getCustomers: async () => DatabaseCustomerService.search(''),
  getCustomerById: async (id: string | number) => {
    const customers = await DatabaseCustomerService.search('');
    return customers.find((customer) => customer.id === String(id)) || null;
  },
  create: (customer: any) => DatabaseCustomerService.create(customer),
  update: (id: string, customer: any) => DatabaseCustomerService.update(id, customer),
  remove: (id: string) => DatabaseCustomerService.remove(id),
};
