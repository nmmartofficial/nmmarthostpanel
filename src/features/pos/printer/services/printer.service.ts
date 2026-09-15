import type {
  PrinterConnectionResult,
  PrinterPrintResult,
  PrinterStatusResult,
  PrinterSettings,
  PrinterConfiguration,
  PrinterConfigurationCreationInput,
  PrinterConfigurationCreationResult,
  PrinterValidationResult,
  PrinterProcessResult,
  PrinterRepositoryResult
} from '../types/printer.types';
import {
  createPrinterConfiguration,
  validateConfiguration
} from '../utils/printer.utils';
import { RepositoryService } from '../../repository';

export class PrinterService {
  static async connectPrinter(deviceId: string): Promise<PrinterConnectionResult> {
    throw new Error('PrinterService.connectPrinter - Not Implemented');
  }

  static async disconnectPrinter(): Promise<PrinterConnectionResult> {
    throw new Error('PrinterService.disconnectPrinter - Not Implemented');
  }

  static async printDocument(document: any): Promise<PrinterPrintResult> {
    throw new Error('PrinterService.printDocument - Not Implemented');
  }

  static async getPrinterStatus(): Promise<PrinterStatusResult> {
    throw new Error('PrinterService.getPrinterStatus - Not Implemented');
  }

  static async configurePrinter(settings: PrinterSettings): Promise<PrinterSettings> {
    throw new Error('PrinterService.configurePrinter - Not Implemented');
  }

  static async preparePrintJob(document: any): Promise<any> {
    throw new Error('PrinterService.preparePrintJob - Not Implemented');
  }

  static createConfiguration(input: PrinterConfigurationCreationInput): PrinterConfigurationCreationResult {
    try {
      const configuration = createPrinterConfiguration(input);
      return {
        success: true,
        configuration,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        configuration: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static validateConfiguration(input: PrinterConfigurationCreationInput): PrinterValidationResult {
    return validateConfiguration(input);
  }

  static processPrinter(input: PrinterConfigurationCreationInput): PrinterProcessResult {
    try {
      // Step 1: Create Configuration
      const createResult = this.createConfiguration(input);
      if (!createResult.success || !createResult.configuration) {
        return {
          success: false,
          configuration: null,
          validation: null,
          error: createResult.error || 'Failed to create configuration'
        };
      }

      // Step 2: Validate Configuration
      const validationResult = this.validateConfiguration(input);

      // Step 3: Return Result
      return {
        success: validationResult.isValid,
        configuration: createResult.configuration,
        validation: validationResult,
        error: validationResult.isValid ? null : 'Configuration validation failed'
      };
    } catch (error) {
      return {
        success: false,
        configuration: null,
        validation: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Repository Functions - Pure Functions
  static addConfiguration(configurations: PrinterConfiguration[], configuration: PrinterConfiguration): { configurations: PrinterConfiguration[], result: PrinterRepositoryResult } {
    const index = configurations.findIndex(c => c.configurationId === configuration.configurationId);
    if (index !== -1) {
      return {
        configurations,
        result: {
          success: false,
          printerId: null,
          repositoryStatus: 'ERROR',
          savedAt: new Date(),
          error: 'Configuration with this ID already exists'
        }
      };
    }
    const newConfigurations = [...configurations, configuration];
    return {
      configurations: newConfigurations,
      result: {
        success: true,
        printerId: configuration.printerId,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null
      }
    };
  }

  static removeConfiguration(configurations: PrinterConfiguration[], configurationId: string): { configurations: PrinterConfiguration[], result: PrinterRepositoryResult } {
    const index = configurations.findIndex(c => c.configurationId === configurationId);
    if (index === -1) {
      return {
        configurations,
        result: {
          success: false,
          printerId: null,
          repositoryStatus: 'ERROR',
          savedAt: new Date(),
          error: 'Configuration not found'
        }
      };
    }
    const newConfigurations = [...configurations.slice(0, index), ...configurations.slice(index + 1)];
    return {
      configurations: newConfigurations,
      result: {
        success: true,
        printerId: configurations[index].printerId,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null
      }
    };
  }

  static updateConfiguration(configurations: PrinterConfiguration[], configurationId: string, updates: Partial<PrinterConfiguration>): { configurations: PrinterConfiguration[], result: PrinterRepositoryResult } {
    const index = configurations.findIndex(c => c.configurationId === configurationId);
    if (index === -1) {
      return {
        configurations,
        result: {
          success: false,
          printerId: null,
          repositoryStatus: 'ERROR',
          savedAt: new Date(),
          error: 'Configuration not found'
        }
      };
    }
    const updatedConfiguration = {
      ...configurations[index],
      ...updates,
      configurationId, // Ensure configurationId doesn't change
      updatedAt: new Date() // Update timestamp
    };
    const newConfigurations = [
      ...configurations.slice(0, index),
      updatedConfiguration,
      ...configurations.slice(index + 1)
    ];
    return {
      configurations: newConfigurations,
      result: {
        success: true,
        printerId: updatedConfiguration.printerId,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null
      }
    };
  }

  static findConfiguration(configurations: PrinterConfiguration[], configurationId: string): PrinterConfiguration | undefined {
    return configurations.find(c => c.configurationId === configurationId);
  }

  static getConfigurations(configurations: PrinterConfiguration[]): PrinterConfiguration[] {
    return [...configurations]; // Return a copy for immutability
  }

  static clearConfigurations(): { configurations: PrinterConfiguration[], result: PrinterRepositoryResult } {
    return {
      configurations: [],
      result: {
        success: true,
        printerId: null,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null
      }
    };
  }

  static savePrinter(printerConfiguration: PrinterConfiguration | null): PrinterRepositoryResult {
    if (!printerConfiguration) {
      return {
        success: false,
        printerId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: 'No printer configuration provided'
      };
    }

    const adapter = RepositoryService.createStorageAdapter('IN_MEMORY');
    const entity = {
      ...printerConfiguration,
      id: printerConfiguration.configurationId
    };
    const result = adapter.save('printer', entity);

    return {
      success: result.success,
      printerId: printerConfiguration.printerId,
      repositoryStatus: result.success ? 'SUCCESS' : 'ERROR',
      savedAt: result.timestamp,
      error: result.error
    };
  }
}
