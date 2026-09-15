import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { initialPrinterState } from '../store/printer.state';
import { PrinterService } from '../services/printer.service';

const PrinterContext = createContext(null);

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

export const PrinterProvider = ({ children }) => {
  const [printerId, setPrinterId] = useState(initialPrinterState.printerId);
  const [printerName, setPrinterName] = useState(initialPrinterState.printerName);
  const [printerType, setPrinterType] = useState(initialPrinterState.printerType);
  const [printerStatus, setPrinterStatus] = useState(initialPrinterState.printerStatus);
  const [isConnected, setConnected] = useState(initialPrinterState.isConnected);
  const [isPrinting, setPrinting] = useState(initialPrinterState.isPrinting);
  const [copies, setCopies] = useState(initialPrinterState.copies);
  const [paperWidth, setPaperWidth] = useState(initialPrinterState.paperWidth);
  const [lastPrintedAt, setLastPrintedAt] = useState(initialPrinterState.lastPrintedAt);
  const [loading, setLoading] = useState(initialPrinterState.loading);
  const [error, setError] = useState(initialPrinterState.error);
  const [validationErrors, setValidationErrors] = useState(initialPrinterState.validationErrors);
  const [configurations, setConfigurations] = useState(initialPrinterState.configurations);

  const state = useMemo(() => ({
    printerId,
    printerName,
    printerType,
    printerStatus,
    isConnected,
    isPrinting,
    copies,
    paperWidth,
    lastPrintedAt,
    loading,
    error,
    validationErrors,
    configurations
  }), [
    printerId,
    printerName,
    printerType,
    printerStatus,
    isConnected,
    isPrinting,
    copies,
    paperWidth,
    lastPrintedAt,
    loading,
    error,
    validationErrors,
    configurations
  ]);

  const createConfiguration = useCallback((input) => {
    return PrinterService.createConfiguration(input);
  }, []);

  const validateConfiguration = useCallback((input) => {
    const result = PrinterService.validateConfiguration(input);
    setValidationErrors(result.errors);
    return result;
  }, []);

  const clearValidation = useCallback(() => {
    setValidationErrors([]);
  }, []);

  const processPrinter = useCallback((input) => {
    return PrinterService.processPrinter(input);
  }, []);

  // Repository Actions
  const addConfiguration = useCallback((configuration) => {
    const { configurations: newConfigs, result } = PrinterService.addConfiguration(configurations, configuration);
    setConfigurations(newConfigs);
    return result;
  }, [configurations]);

  const removeConfiguration = useCallback((configurationId) => {
    const { configurations: newConfigs, result } = PrinterService.removeConfiguration(configurations, configurationId);
    setConfigurations(newConfigs);
    return result;
  }, [configurations]);

  const updateConfiguration = useCallback((configurationId, updates) => {
    const { configurations: newConfigs, result } = PrinterService.updateConfiguration(configurations, configurationId, updates);
    setConfigurations(newConfigs);
    return result;
  }, [configurations]);

  const findConfiguration = useCallback((configurationId) => {
    return PrinterService.findConfiguration(configurations, configurationId);
  }, [configurations]);

  const getConfigurations = useCallback(() => {
    return PrinterService.getConfigurations(configurations);
  }, [configurations]);

  const clearConfigurations = useCallback(() => {
    const { configurations: newConfigs } = PrinterService.clearConfigurations();
    setConfigurations(newConfigs);
  }, []);

  const savePrinter = useCallback(() => {
    const configuration = {
      configurationId: `printer-config-${Date.now()}`,
      printerId: printerId || `printer-${Date.now()}`,
      printerName: printerName || "Default Printer",
      printerType: printerType || "thermal",
      paperWidth: paperWidth || "80mm",
      copies: copies || 1,
      isConnected: isConnected || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return PrinterService.savePrinter(configuration);
  }, [printerId, printerName, printerType, paperWidth, copies, isConnected]);

  const actions = useMemo(() => ({
    setPrinterId,
    setPrinterName,
    setPrinterType,
    setPrinterStatus,
    setConnected,
    setPrinting,
    setCopies,
    setPaperWidth,
    setLastPrintedAt,
    setLoading,
    setError,
    resetPrinter: useCallback(() => {
      setPrinterId(initialPrinterState.printerId);
      setPrinterName(initialPrinterState.printerName);
      setPrinterType(initialPrinterState.printerType);
      setPrinterStatus(initialPrinterState.printerStatus);
      setConnected(initialPrinterState.isConnected);
      setPrinting(initialPrinterState.isPrinting);
      setCopies(initialPrinterState.copies);
      setPaperWidth(initialPrinterState.paperWidth);
      setLastPrintedAt(initialPrinterState.lastPrintedAt);
      setLoading(initialPrinterState.loading);
      setError(initialPrinterState.error);
      setValidationErrors(initialPrinterState.validationErrors);
      setConfigurations(initialPrinterState.configurations);
    }, []),
    createConfiguration,
    validateConfiguration,
    clearValidation,
    processPrinter,
    addConfiguration,
    removeConfiguration,
    updateConfiguration,
    findConfiguration,
    getConfigurations,
    clearConfigurations,
    savePrinter
  }), [createConfiguration, validateConfiguration, clearValidation, processPrinter, addConfiguration, removeConfiguration, updateConfiguration, findConfiguration, getConfigurations, clearConfigurations, savePrinter]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
};
