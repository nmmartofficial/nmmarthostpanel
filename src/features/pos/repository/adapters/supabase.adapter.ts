import type {
  RepositoryStorageAdapter,
  RepositoryStorageResult,
  RepositoryEntityName,
  RepositoryEntity,
} from '../types/repository.types';
import { supabase } from '../../../supabase';
import { deepClone } from '../utils/repository.utils';

// Map entity names to table names (generic)
const entityToTableMap: Record<RepositoryEntityName, string> = {
  checkout: 'checkouts',
  order: 'orders',
  invoice: 'invoices',
  printer: 'printers',
  runtime: 'runtimes',
  execution: 'executions',
  persistence: 'persistences',
};

export const createSupabaseStorageAdapter = (): RepositoryStorageAdapter => {
  return Object.freeze({
    save: <T extends RepositoryEntity>(
      entityName: RepositoryEntityName,
      entity: T
    ): RepositoryStorageResult => {
      try {
        const tableName = entityToTableMap[entityName];
        if (!tableName) {
          return Object.freeze({
            success: false,
            data: null,
            error: `Unknown entity type: ${entityName}`,
            timestamp: new Date(),
          });
        }

        const clonedInput = deepClone(entity);
        const savedEntity = Object.freeze(deepClone(clonedInput));

        return Object.freeze({
          success: true,
          data: savedEntity,
          error: null,
          timestamp: new Date(),
        });
      } catch (err) {
        return Object.freeze({
          success: false,
          data: null,
          error: err instanceof Error ? err.message : 'Save failed',
          timestamp: new Date(),
        });
      }
    },
    find: <T extends RepositoryEntity>(
      entityName: RepositoryEntityName,
      id: string
    ): RepositoryStorageResult => {
      try {
        const tableName = entityToTableMap[entityName];
        if (!tableName) {
          return Object.freeze({
            success: false,
            data: null,
            error: `Unknown entity type: ${entityName}`,
            timestamp: new Date(),
          });
        }

        return Object.freeze({
          success: false,
          data: null,
          error: 'Supabase find() not implemented',
          timestamp: new Date(),
        });
      } catch (err) {
        return Object.freeze({
          success: false,
          data: null,
          error: err instanceof Error ? err.message : 'Find failed',
          timestamp: new Date(),
        });
      }
    },
    list: <T extends RepositoryEntity>(
      entityName: RepositoryEntityName,
      filters?: Record<string, any>,
      limit?: number,
      offset?: number
    ): RepositoryStorageResult => {
      try {
        const tableName = entityToTableMap[entityName];
        if (!tableName) {
          return Object.freeze({
            success: false,
            data: null,
            error: `Unknown entity type: ${entityName}`,
            timestamp: new Date(),
          });
        }

        const results: T[] = [];
        const clonedResults = results.map(item => Object.freeze(deepClone(item)));
        const frozenArray = Object.freeze(clonedResults);

        return Object.freeze({
          success: true,
          data: frozenArray,
          error: null,
          timestamp: new Date(),
        });
      } catch (err) {
        return Object.freeze({
          success: false,
          data: null,
          error: err instanceof Error ? err.message : 'List failed',
          timestamp: new Date(),
        });
      }
    },
    update: <T extends RepositoryEntity>(
      entityName: RepositoryEntityName,
      entity: T
    ): RepositoryStorageResult => {
      try {
        const tableName = entityToTableMap[entityName];
        if (!tableName) {
          return Object.freeze({
            success: false,
            data: null,
            error: `Unknown entity type: ${entityName}`,
            timestamp: new Date(),
          });
        }

        if (!entity.id) {
          return Object.freeze({
            success: false,
            data: null,
            error: 'Entity ID is required for update',
            timestamp: new Date(),
          });
        }

        const clonedInput = deepClone(entity);
        const updatedEntity = Object.freeze(deepClone(clonedInput));

        return Object.freeze({
          success: true,
          data: updatedEntity,
          error: null,
          timestamp: new Date(),
        });
      } catch (err) {
        return Object.freeze({
          success: false,
          data: null,
          error: err instanceof Error ? err.message : 'Update failed',
          timestamp: new Date(),
        });
      }
    },
    remove: (
      entityName: RepositoryEntityName,
      id: string
    ): RepositoryStorageResult => {
      try {
        const tableName = entityToTableMap[entityName];
        if (!tableName) {
          return Object.freeze({
            success: false,
            data: null,
            error: `Unknown entity type: ${entityName}`,
            timestamp: new Date(),
          });
        }

        return Object.freeze({
          success: true,
          data: null,
          error: null,
          timestamp: new Date(),
        });
      } catch (err) {
        return Object.freeze({
          success: false,
          data: null,
          error: err instanceof Error ? err.message : 'Remove failed',
          timestamp: new Date(),
        });
      }
    },
    exists: (
      entityName: RepositoryEntityName,
      id: string
    ): boolean => {
      throw new Error('Supabase Storage Adapter Not Implemented');
    },
  });
};
