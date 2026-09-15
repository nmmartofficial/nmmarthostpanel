import type { PrinterState } from '../types/printer.types';
import { PRINTER_STATUS } from '../constants/printer.constants';

export const initialPrinterState: PrinterState = {
  printerId: null,
  printerName: null,
  printerType: null,
  printerStatus: PRINTER_STATUS.IDLE,
  isConnected: false,
  isPrinting: false,
  copies: 1,
  paperWidth: null,
  lastPrintedAt: null,
  loading: false,
  error: '',
  validationErrors: [],
  configurations: []
};
