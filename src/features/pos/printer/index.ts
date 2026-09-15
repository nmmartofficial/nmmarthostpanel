export { PRINTER_STATUS } from './constants/printer.constants';

export type {
  PrinterStatus,
  PrinterDevice,
  PrinterSettings,
  PrinterConnectionResult,
  PrinterPrintResult,
  PrinterStatusResult,
  PrinterConfiguration,
  PrinterConfigurationCreationInput,
  PrinterConfigurationCreationResult,
  PrinterValidationError,
  PrinterValidationResult,
  PrinterProcessResult,
  PrinterRepositoryResult,
  PrinterState,
  PrinterActions
} from './types/printer.types';

export { initialPrinterState } from './store/printer.state';
export { createPrinterActions } from './store/printer.actions';
export {
  selectPrinterStatus,
  selectSelectedDevice,
  selectPrinterSettings,
  selectPrinterLoading,
  selectPrinterError
} from './store/printer.selectors';
export { PrinterService } from './services/printer.service';
export { PrinterProvider, usePrinter as usePrinterContext } from './context/PrinterContext';
export { usePrinter } from './hooks/usePrinter';
export {
  buildPrinterConnectionPayload,
  buildPrintJob,
  formatPrinterStatus,
  validatePrinterSettings,
  simulatePrinterResponse,
  createPrinterConnectionResult,
  createPrinterPrintResult,
  createPrinterStatusResult,
  generatePrinterConfigurationId,
  createPrinterConfiguration,
  clonePrinterConfiguration,
  freezePrinterConfiguration,
  validatePrinterId,
  validatePrinterName,
  validatePrinterType,
  validatePaperWidth,
  validateCopies,
  validateConfiguration
} from './utils/printer.utils';
