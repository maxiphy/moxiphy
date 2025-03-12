import Papa from 'papaparse';

/**
 * Parse a CSV file and return the data as an array of objects
 * @param file The CSV file to parse
 * @returns A promise that resolves to the parsed CSV data
 */
export function parseCSV(file: File): Promise<{ data: any[]; errors: Papa.ParseError[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          data: results.data,
          errors: results.errors,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Convert an array of objects to a CSV string
 * @param data The data to convert to CSV
 * @returns The CSV string
 */
export function unparseCSV(data: any[]): string {
  return Papa.unparse(data);
}

/**
 * Download a CSV string as a file
 * @param csvString The CSV string to download
 * @param fileName The name of the file to download
 */
export function downloadCSV(csvString: string, fileName: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Set link properties
  link.setAttribute('href', url);
  link.setAttribute('download', fileName || 'export.csv');
  link.style.visibility = 'hidden';
  
  // Append to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Release the URL object
  URL.revokeObjectURL(url);
}

/**
 * Identify missing fields in CSV data
 * @param data The CSV data to check for missing fields
 * @returns An array of objects with row index and missing fields
 */
export function identifyMissingFields(data: any[]): { rowIndex: number; missingFields: string[] }[] {
  return data.map((row, index) => {
    const missingFields = Object.keys(row).filter(key => !row[key]);
    return {
      rowIndex: index,
      missingFields,
    };
  }).filter(item => item.missingFields.length > 0);
}

/**
 * Get column headers from CSV data
 * @param data The CSV data
 * @returns An array of column headers
 */
export function getCSVHeaders(data: any[]): string[] {
  if (!data || data.length === 0) {
    return [];
  }
  return Object.keys(data[0]);
}

/**
 * Check if a CSV has missing values
 * @param data The CSV data to check
 * @returns True if the CSV has missing values, false otherwise
 */
export function hasMissingValues(data: any[]): boolean {
  return data.some(row => 
    Object.values(row).some(value => !value)
  );
}
