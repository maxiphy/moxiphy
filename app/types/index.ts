// CSV Data Types
export interface CSVRow {
  [key: string]: string;
}

export interface CSVData {
  data: CSVRow[];
  fileName: string;
}

// API Response Types
export interface CompletionResponse {
  completedData: CSVRow[];
  error?: string;
}

export interface ImageResult {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  credit: {
    name: string;
    link: string;
  };
}

export interface ImageResponse {
  images: ImageResult[];
  error?: string;
}

// UI Component Props
export interface FileUploadProps {
  onFileLoaded: (data: CSVRow[], fileName: string) => void;
  onError: (error: string) => void;
}

export interface DataTableProps {
  data: CSVRow[];
  fileName: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
  children: React.ReactNode;
}

// Processing Status
export interface ProcessingStatus {
  isProcessing: boolean;
  progress: number;
  total: number;
  message: string;
}

// CSV Enrichment Types
export interface EnrichedCSVRow extends Omit<CSVRow, 'imageUrl' | 'imageThumb' | 'imageAlt' | 'imageCredit'> {
  [key: string]: string;
  imageUrl: string;
  imageThumb: string;
  imageAlt: string;
  imageCredit: string;
}

export interface CSVEnrichmentState {
  csvData: CSVRow[] | null;
  fileName: string;
  isProcessing: boolean;
  isEnrichingImages: boolean;
  hasImages: boolean;
  processingProgress: number;
}
