import { usePrinter as usePrinterContext } from '../context/PrinterContext';

export const usePrinter = () => {
  const context = usePrinterContext();

  return {
    state: context.state,
    actions: context.actions
  };
};
