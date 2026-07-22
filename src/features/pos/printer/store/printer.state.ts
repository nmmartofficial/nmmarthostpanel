import type { PrinterState } from '../types/printer.types';
import { PRINTER_STATUS } from '../constants/printer.constants';

export const initialPrinterState: PrinterState = {
  printerStatus: PRINTER_STATUS.IDLE,
  selectedDevice: null,
  settings: {
    pageSize: 'A4',
    duplex: false
  },
  loading: false,
  error: ''
};
