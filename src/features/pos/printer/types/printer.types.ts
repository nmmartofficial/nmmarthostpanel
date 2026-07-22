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

export interface PrinterState {
  printerStatus: PrinterStatus;
  selectedDevice: PrinterDevice | null;
  settings: PrinterSettings;
  loading: boolean;
  error: string;
}

export interface PrinterActions {
  setPrinterStatus: (printerStatus: PrinterStatus) => void;
  setSelectedDevice: (selectedDevice: PrinterDevice | null) => void;
  setSettings: (settings: PrinterSettings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetPrinter: () => void;
  connectPrinter: (deviceId: string) => Promise<PrinterConnectionResult>;
  disconnectPrinter: () => Promise<PrinterConnectionResult>;
  printDocument: (document: any) => Promise<PrinterPrintResult>;
  getPrinterStatus: () => Promise<PrinterStatusResult>;
  configurePrinter: (settings: PrinterSettings) => PrinterSettings;
  preparePrintJob: (document: any) => any;
}
