"use client";

import React, { useState } from 'react';
import Button from './ui/Button';
import ColumnDefinitionManager, { ColumnDefinition } from './ColumnDefinitionManager';

interface MockDataGeneratorProps {
  onGenerateMockData: (columns: ColumnDefinition[], rowCount: number) => void;
  isGenerating: boolean;
}

const MockDataGenerator: React.FC<MockDataGeneratorProps> = ({ 
  onGenerateMockData,
  isGenerating
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: '', type: 'text', required: true }
  ]);
  const [rowCount, setRowCount] = useState<number>(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all columns have names
    const isValid = columns.every(col => col.name.trim() !== '');
    
    if (isValid) {
      onGenerateMockData(columns, rowCount);
    } else {
      alert('Please provide names for all columns');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Generate Mock CSV Data</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Rows
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={rowCount}
            onChange={(e) => setRowCount(parseInt(e.target.value) || 10)}
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
          />
        </div>
        
        <div className="mb-4">
          <ColumnDefinitionManager 
            initialColumns={columns}
            onColumnsChange={setColumns}
          />
        </div>
        
        <div className="mt-6">
          <Button
            variant="primary"
            type="submit"
            isLoading={isGenerating}
            disabled={isGenerating || columns.length === 0}
            className="w-full"
          >
            Generate Mock Data
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MockDataGenerator;
