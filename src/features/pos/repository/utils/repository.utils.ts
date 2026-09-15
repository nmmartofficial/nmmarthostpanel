/**
 * Repository Module Utilities
 * Phase 17 - Step 2
 */

import type { RepositoryEntity } from '../types/repository.types';

// Deep clone utility to avoid mutation
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }

  const cloned = { ...obj } as Record<string, any>;
  for (const key in cloned) {
    if (Object.prototype.hasOwnProperty.call(cloned, key)) {
      cloned[key] = deepClone(cloned[key]);
    }
  }
  return cloned as T;
}

// In-memory repository store
export function createRepositoryStore<T extends RepositoryEntity>() {
  const entities = new Map<string, T>();

  return {
    save: (entity: T): T => {
      const cloned = deepClone(entity);
      entities.set(cloned.id, cloned);
      return Object.freeze(deepClone(cloned));
    },

    find: (id: string): T | null => {
      const entity = entities.get(id);
      return entity ? Object.freeze(deepClone(entity)) : null;
    },

    list: (filters?: Record<string, any>, limit?: number, offset?: number): T[] => {
      let result: T[] = Array.from(entities.values()).map(e => deepClone(e));

      if (filters) {
        result = result.filter(entity => {
          for (const key in filters) {
            if (Object.prototype.hasOwnProperty.call(filters, key)) {
              if (entity[key] !== filters[key]) {
                return false;
              }
            }
          }
          return true;
        });
      }

      if (offset !== undefined) {
        result = result.slice(offset);
      }
      if (limit !== undefined) {
        result = result.slice(0, limit);
      }

      return result.map(e => Object.freeze(e));
    },

    update: (entity: T): T | null => {
      if (!entities.has(entity.id)) {
        return null;
      }
      const cloned = deepClone(entity);
      entities.set(cloned.id, cloned);
      return Object.freeze(deepClone(cloned));
    },

    remove: (id: string): boolean => {
      return entities.delete(id);
    },

    exists: (id: string): boolean => {
      return entities.has(id);
    },
  };
}

export function repositoryPlaceholderUtil(): void {
  throw new Error('repository.utils.repositoryPlaceholderUtil - Not Implemented');
}
