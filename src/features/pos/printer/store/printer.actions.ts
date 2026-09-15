import type { PrinterActions, PrinterState } from '../types/printer.types';
import { initialPrinterState } from './printer.state';

export const createPrinterActions = (state: PrinterState, setState: (state: PrinterState) => void): PrinterActions => ({
  setPrinterStatus: (printerStatus: PrinterState['printerStatus']) => {
    throw new Error('printer.actions.setPrinterStatus - Not Implemented');
  },
  setSelectedDevice: (selectedDevice: PrinterState['selectedDevice']) => {
    throw new Error('printer.actions.setSelectedDevice - Not Implemented');
  },
  setSettings: (settings: PrinterState['settings']) => {
    throw new Error('printer.actions.setSettings - Not Implemented');
  },
  setLoading: (loading: boolean) => {
    throw new Error('printer.actions.setLoading - Not Implemented');
  },
  setError: (error: string) => {
    throw new Error('printer.actions.setError - Not Implemented');
  },
  resetPrinter: () => {
    throw new Error('printer.actions.resetPrinter - Not Implemented');
  },
  connectPrinter: async (deviceId: string) => {
    throw new Error('printer.actions.connectPrinter - Not Implemented');
  },
  disconnectPrinter: async () => {
    throw new Error('printer.actions.disconnectPrinter - Not Implemented');
  },
  printDocument: async (document: any) => {
    throw new Error('printer.actions.printDocument - Not Implemented');
  },
  getPrinterStatus: async () => {
    throw new Error('printer.actions.getPrinterStatus - Not Implemented');
  },
  configurePrinter: (settings: PrinterState['settings']) => {
    throw new Error('printer.actions.configurePrinter - Not Implemented');
  },
  preparePrintJob: (document: any) => {
    throw new Error('printer.actions.preparePrintJob - Not Implemented');
  }
});
