import { PRINTER_STATUS } from '../constants/printer.constants';

export type PrinterStatus = typeof PRINTER_STATUS[keyof typeof PRINTER_STATUS];

export interface PrinterDevice {
  deviceId: string;
  name: string;
  status: PrinterStatus;
}

export interface PrinterSettings {
  pageSize: string;
  duplex: boolean;
}

export interface PrinterConnectionResult {
  success: boolean;
  printer: PrinterDevice | null;
  error: string | null;
}

export interface PrinterPrintResult {
  success: boolean;
  jobId: string | null;
  error: string | null;
}

export interface PrinterStatusResult {
  status: PrinterStatus;
  message: string | null;
}

export interface PrinterConfiguration {
  configurationId: string;
  printerId: string;
  printerName: string;
  printerType: string;
  paperWidth: string;
  copies: number;
  isConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrinterConfigurationCreationInput {
  configurationId?: string;
  printerId: string;
  printerName: string;
  printerType: string;
  paperWidth: string;
  copies: number;
  isConnected: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrinterConfigurationCreationResult {
  success: boolean;
  configuration: PrinterConfiguration | null;
  error: string | null;
}

export interface PrinterProcessResult {
  success: boolean;
  configuration: PrinterConfiguration | null;
  validation: PrinterValidationResult | null;
  error: string | null;
}

export interface PrinterRepositoryResult {
  success: boolean;
  printerId: string | null;
  repositoryStatus: string;
  savedAt: Date;
  error: string | null;
}

export interface PrinterValidationError {
  field: string;
  message: string;
}

export interface PrinterValidationResult {
  isValid: boolean;
  errors: PrinterValidationError[];
}

export interface PrinterState {
  printerId: string | null;
  printerName: string | null;
  printerType: string | null;
  printerStatus: PrinterStatus;
  isConnected: boolean;
  isPrinting: boolean;
  copies: number;
  paperWidth: string | null;
  lastPrintedAt: string | null;
  loading: boolean;
  error: string;
  validationErrors: PrinterValidationError[];
  configurations: PrinterConfiguration[];
}

export interface PrinterActions {
  setPrinterId: (printerId: string | null) => void;
  setPrinterName: (printerName: string | null) => void;
  setPrinterType: (printerType: string | null) => void;
  setPrinterStatus: (printerStatus: PrinterStatus) => void;
  setConnected: (isConnected: boolean) => void;
  setPrinting: (isPrinting: boolean) => void;
  setCopies: (copies: number) => void;
  setPaperWidth: (paperWidth: string | null) => void;
  setLastPrintedAt: (lastPrintedAt: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetPrinter: () => void;
  createConfiguration: (input: PrinterConfigurationCreationInput) => PrinterConfigurationCreationResult;
  validateConfiguration: (input: PrinterConfigurationCreationInput) => PrinterValidationResult;
  clearValidation: () => void;
  processPrinter: (input: PrinterConfigurationCreationInput) => PrinterProcessResult;
  addConfiguration: (configuration: PrinterConfiguration) => PrinterRepositoryResult;
  removeConfiguration: (configurationId: string) => PrinterRepositoryResult;
  updateConfiguration: (configurationId: string, updates: Partial<PrinterConfiguration>) => PrinterRepositoryResult;
  findConfiguration: (configurationId: string) => PrinterConfiguration | undefined;
  getConfigurations: () => PrinterConfiguration[];
  clearConfigurations: () => void;
  savePrinter: () => PrinterRepositoryResult;
}
