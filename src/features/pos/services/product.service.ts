import { DB_SCHEMA } from '../../../dbSchema';
import { dbSync } from '../../../dbSync';

const safeArray = <T>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];

export const ProductService = {
  getProducts: async () => {
    try {
      const products = await dbSync.fetch(DB_SCHEMA.PRODUCTS.table, {
        order: { column: 'created_at', ascending: false },
      });
      return safeArray(products);
    } catch (error) {
      const failure: any = new Error(error?.message || 'Product lookup failed');
      failure.code = error?.code || 'PRODUCT_LOOKUP_FAILED';
      failure.details = error?.details || null;
      throw failure;
    }
  },
  getProductById: async (id: string | number) => {
    try {
      const list = await dbSync.fetch(DB_SCHEMA.PRODUCTS.table, {
        eq: { column: 'id', value: id },
      });
      return safeArray(list)[0] ?? null;
    } catch (error) {
      const failure: any = new Error(error?.message || 'Product lookup failed');
      failure.code = error?.code || 'PRODUCT_LOOKUP_FAILED';
      failure.details = error?.details || null;
      throw failure;
    }
  }
};
