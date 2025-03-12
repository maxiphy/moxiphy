"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface FileUploadProps {
  onFileLoaded: (data: any[], fileName: string) => void;
  onError: (error: string) => void;
}

export default function FileUpload({ onFileLoaded, onError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    setFileName(file.name);
    setIsUploading(true);

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      onError('File size exceeds 10MB limit');
      setIsUploading(false);
      return;
    }

    // Parse CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          onError(`Error parsing CSV: ${results.errors[0].message}`);
        } else {
          onFileLoaded(results.data, file.name);
        }
        setIsUploading(false);
      },
      error: (error) => {
        onError(`Error parsing CSV: ${error.message}`);
        setIsUploading(false);
      }
    });
  }, [onFileLoaded, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        isDragActive 
          ? 'border-indigo-500 bg-indigo-50' 
          : 'border-gray-300 hover:border-indigo-400'
      }`}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-sm text-gray-600">
          {isUploading ? (
            <p>Processing file...</p>
          ) : fileName ? (
            <p>
              <span className="font-medium text-indigo-600">{fileName}</span> uploaded. 
              <span className="ml-2 text-gray-500 underline cursor-pointer">Upload a different file</span>
            </p>
          ) : (
            <>
              <span className="font-medium text-indigo-600 hover:text-indigo-500">
                Click to upload a CSV file
              </span>
              <p className="pl-1">or drag and drop</p>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500">
          CSV file up to 10MB
        </p>
      </div>
    </div>
  );
}
