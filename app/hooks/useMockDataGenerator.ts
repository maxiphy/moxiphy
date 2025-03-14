"use client";

import { useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../lib/apiUtils';

interface ColumnDefinition {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  enumValues?: string[];
  description?: string;
}

export default function useMockDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<any[] | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState(0);

  const generateMockData = async (columns: ColumnDefinition[], rowCount: number) => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Create a descriptive filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `mock-data-${timestamp}.csv`;
      setGeneratedFileName(fileName);
      
      // Call the API to generate the data with authentication
      const response = await fetchWithAuth('/api/generate-mock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ columns, rowCount }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate mock data');
      }
      
      // Get the generated data
      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        setGeneratedData(result.data);
        setGenerationProgress(100);
        toast.success(`Generated ${rowCount} rows of mock data successfully!`);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating mock data:', error);
      toast.error('Failed to generate mock data. Please try again.');
      setGeneratedData(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadGeneratedCSV = () => {
    if (!generatedData) return;
    
    const csv = Papa.unparse(generatedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', generatedFileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    isGenerating,
    generatedData,
    generatedFileName,
    generationProgress,
    generateMockData,
    downloadGeneratedCSV,
  };
}
