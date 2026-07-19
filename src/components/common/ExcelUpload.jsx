import React, { useState } from 'react';
import { FileJson, Download } from 'lucide-react';
import { uploadExcelForTable, downloadExcelTemplate } from '../../erpController';
import { TABLE_COLUMN_MAPPINGS } from '../../dbSchema';

/**
 * Excel Upload Component
 * A reusable component for uploading Excel files to any table in the system
 * @param {Object} props
 * @param {string} props.tableKey - The table key from DB_SCHEMA (e.g., 'PRODUCTS', 'CATEGORIES')
 * @param {function} props.onSuccess - Callback when upload succeeds
 * @param {function} props.onError - Callback when upload fails
 * @param {string} props.uniqueField - Optional unique field for deduplication
 * @param {function} props.processData - Optional custom function to process parsed data
 * @param {string} props.buttonText - Custom button text
 * @param {boolean} props.showTemplateDownload - Show download template button
 */
const ExcelUpload = ({ 
  tableKey, 
  onSuccess, 
  onError, 
  uniqueField = null,
  processData = null,
  buttonText = 'Import',
  showTemplateDownload = true 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset the file input
    e.target.value = '';
    
    uploadExcelForTable(
      file, 
      tableKey, 
      setIsLoading, 
      onSuccess, 
      onError, 
      uniqueField,
      processData
    );
  };
  
  const handleDownloadTemplate = () => {
    downloadExcelTemplate(tableKey);
  };
  
  const triggerFileInput = () => {
    const input = document.getElementById(`excel-upload-${tableKey}`);
    if (input) input.click();
  };
  
  return (
    <div className="flex items-center gap-2">
      <input
        id={`excel-upload-${tableKey}`}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
        disabled={isLoading}
      />
      
      {showTemplateDownload && (
        <button
          onClick={handleDownloadTemplate}
          className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          title="Download sample template"
        >
          <Download size={14} />
          Template
        </button>
      )}
      
      <button
        onClick={triggerFileInput}
        className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        <FileJson size={14} />
        {isLoading ? 'Importing...' : buttonText}
      </button>
    </div>
  );
};

export default ExcelUpload;
