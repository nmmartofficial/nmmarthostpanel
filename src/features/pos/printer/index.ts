export { PRINTER_STATUS } from './constants/printer.constants';

export type {
  PrinterStatus,
  PrinterDevice,
  PrinterSettings,
  PrinterConnectionResult,
  PrinterPrintResult,
  PrinterStatusResult,
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
  createPrinterStatusResult
} from './utils/printer.utils';
