import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import { CSVRow } from '../types';
import { hasMissingValues, downloadCSV } from '../lib/csvUtils';
import { batchEnrichProductsWithImages } from '../lib/imageUtils';

interface UseCSVEnrichmentProps {
  onProgress?: (progress: number) => void;
}

interface UseCSVEnrichmentReturn {
  csvData: CSVRow[] | null;
  fileName: string;
  isProcessing: boolean;
  isEnrichingImages: boolean;
  hasImages: boolean;
  processingProgress: number;
  handleFileLoaded: (data: CSVRow[], name: string) => void;
  handleError: (error: string) => void;
  handleCompleteData: () => Promise<void>;
  handleEnrichImages: () => Promise<void>;
  handleDownload: () => void;
  resetData: () => void;
}

export default function useCSVEnrichment({ 
  onProgress 
}: UseCSVEnrichmentProps = {}): UseCSVEnrichmentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnrichingImages, setIsEnrichingImages] = useState(false);
  const [csvData, setCsvData] = useState<CSVRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [hasImages, setHasImages] = useState(false);

  // Update progress and notify parent component if callback provided
  const updateProgress = (progress: number) => {
    setProcessingProgress(progress);
    if (onProgress) {
      onProgress(progress);
    }
  };

  // Handle file upload
  const handleFileLoaded = (data: CSVRow[], name: string) => {
    setCsvData(data);
    setFileName(name);
    setHasImages(false);
    toast.success(`File uploaded: ${name}`);
  };

  // Handle file upload errors
  const handleError = (error: string) => {
    toast.error(error);
  };

  // Reset data
  const resetData = () => {
    setCsvData(null);
    setFileName('');
    setProcessingProgress(0);
    setHasImages(false);
  };

  // Handle data completion
  const handleCompleteData = async () => {
    if (!csvData) return;

    setIsProcessing(true);
    updateProgress(0);
    toast.loading('Processing data...', { id: 'processing' });

    try {
      // Check if there are missing values to complete
      if (!hasMissingValues(csvData)) {
        toast.success('No missing data to complete!', { id: 'processing' });
        setIsProcessing(false);
        return;
      }

      // Get headers from the first row
      const headers = Object.keys(csvData[0]);
      
      // Find rows with missing values (excluding Image field)
      const rowsWithMissing = csvData.map((row, index) => {
        // Check if row has missing values (excluding Image field)
        const hasMissing = Object.entries(row).some(([key, val]) => !val && key !== 'Image');
        return { row, index, hasMissing };
      });
      const rowsNeedingCompletion = rowsWithMissing.filter(r => r.hasMissing);
      
      console.log(`Found ${rowsNeedingCompletion.length} rows with missing values (excluding Image field)`);
      
      // Process in smaller batches to avoid token limits
      const BATCH_SIZE = 10; // Process 10 rows at a time
      const batches = [];
      
      for (let i = 0; i < rowsNeedingCompletion.length; i += BATCH_SIZE) {
        batches.push(rowsNeedingCompletion.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`Split into ${batches.length} batches of up to ${BATCH_SIZE} rows each`);
      
      // Create a copy of the original data that we'll update
      const updatedData = [...csvData];
      let completedBatches = 0;
      
      // Process each batch
      for (const batch of batches) {
        // Extract just the rows and their indices for the API call
        const batchData = batch.map(item => item.row);
        const batchIndices = batch.map(item => item.index);
        
        console.log(`Processing batch ${completedBatches + 1}/${batches.length} with ${batchData.length} rows`);
        
        // Call API to complete this batch
        const response = await fetch('/api/complete-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            csvData: batchData, 
            headers,
            rowIndices: batchIndices // Pass the original indices so the API can return them correctly
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }

        console.log(`Received completed data for batch ${completedBatches + 1}:`, result.completedData);
        
        // Verify we have valid data before updating
        if (!result.completedData || !Array.isArray(result.completedData)) {
          console.warn(`Invalid data received for batch ${completedBatches + 1}, skipping`);
          continue;
        }
        
        // Update our data copy with the completed batch data
        for (let i = 0; i < result.completedData.length; i++) {
          const completedRow = result.completedData[i];
          const originalIndex = batchIndices[i];
          
          if (originalIndex !== undefined && originalIndex < updatedData.length) {
            // Merge the completed data with the original row
            updatedData[originalIndex] = { ...updatedData[originalIndex], ...completedRow };
          }
        }
        
        // Update progress
        completedBatches++;
        updateProgress(Math.round((completedBatches / batches.length) * 100));
      }
      
      // Update the CSV data with all completed data
      setCsvData(updatedData);
      console.log('CSV data state updated with all batches processed');
      toast.success('Data completed successfully!', { id: 'processing' });
    } catch (error) {
      console.error('Error completing data:', error);
      toast.error(`Failed to complete data: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'processing' });
    } finally {
      setIsProcessing(false);
      updateProgress(100);
    }
  };

  // Handle image enrichment
  const handleEnrichImages = async () => {
    if (!csvData) return;

    setIsEnrichingImages(true);
    updateProgress(0);
    toast.loading('Fetching images...', { id: 'enriching' });

    try {
      // Calculate total number of products
      const totalProducts = csvData.length;
      let processedProducts = 0;

      // Process in batches of 3 to avoid rate limiting
      const enrichedData = await batchEnrichProductsWithImages(csvData, 3);
      
      // Update CSV data with images
      setCsvData(enrichedData);
      setHasImages(true);
      toast.success('Images added successfully!', { id: 'enriching' });
    } catch (error) {
      console.error('Error enriching with images:', error);
      toast.error(`Failed to add images: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'enriching' });
    } finally {
      setIsEnrichingImages(false);
      updateProgress(100);
    }
  };

  // Handle CSV download
  const handleDownload = () => {
    if (!csvData || !fileName) return;
    
    try {
      // Generate CSV string and download
      const csvString = Papa.unparse(csvData);
      const filePrefix = hasImages ? 'enriched' : 'completed';
      downloadCSV(csvString, `${filePrefix}_${fileName}`);
      toast.success('CSV downloaded successfully!');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error(`Failed to download CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    csvData,
    fileName,
    isProcessing,
    isEnrichingImages,
    hasImages,
    processingProgress,
    handleFileLoaded,
    handleError,
    handleCompleteData,
    handleEnrichImages,
    handleDownload,
    resetData
  };
}
