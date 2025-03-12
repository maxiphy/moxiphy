"use client";

import { Toaster } from "react-hot-toast";
import FileUpload from "./components/ui/FileUpload";
import DataTable from "./components/ui/DataTable";
import Button from "./components/ui/Button";
import Logo from "./components/ui/Logo";
import { hasMissingValues } from "./lib/csvUtils";
import useCSVEnrichment from "./hooks/useCSVEnrichment";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Link from "next/link";
import { useState } from "react";
import { PlusIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import ColumnConstraintsEditor from "./components/ColumnConstraintsEditor";

export default function Home() {
  const { isAuthenticated, logout } = useAuth();
  const {
    csvData,
    fileName,
    isProcessing,
    isEnrichingImages,
    hasImages,
    processingProgress,
    columnConstraints,
    handleFileLoaded,
    handleError,
    handleCompleteData,
    handleEnrichImages,
    handleDownload,
    setColumnConstraints
  } = useCSVEnrichment();
  
  const [showConstraintsEditor, setShowConstraintsEditor] = useState(false);

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Fixed Navbar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Logo size="md" />
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/sample.csv" 
                download
                className="text-sm text-[#008DC1] hover:text-[#007aa8] underline"
              >
                Download Sample CSV
              </a>
              <Link href="/generate" className="text-sm text-[#008DC1] hover:text-[#007aa8] underline">
                Generate Mock Data
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-xl font-extrabold text-gray-900 sm:text-3xl">
            CSV Completion & Enrichment Tool
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Upload your CSV file, complete missing data with AI, and enrich with images
          </p>
          <div className="mt-4">
            <Link href="/generate">
              <Button variant="secondary" className="flex items-center">
                <PlusIcon className="h-4 w-4 mr-2" />
                Generate New Mock Data
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          {/* File Upload Component */}
          <FileUpload onFileLoaded={handleFileLoaded} onError={handleError} />

          {/* Action Buttons and Progress Bar (above table) */}
          {csvData && (
            <div className="mt-8">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">CSV Preview</h2>
                    <p className="text-sm text-gray-500">
                      {hasMissingValues(csvData) 
                        ? "Your CSV has missing values. Click 'Complete Data' to fill them using AI. (images fields will be added)"
                        : "All data fields are complete."}
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <Button
                      variant="primary"
                      onClick={handleCompleteData}
                      disabled={!csvData || isProcessing || isEnrichingImages || !hasMissingValues(csvData)}
                      isLoading={isProcessing}
                    >
                      Complete Data
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleEnrichImages}
                      disabled={!csvData || isProcessing || isEnrichingImages}
                      isLoading={isEnrichingImages}
                    >
                      Enrich with Images
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowConstraintsEditor(true)}
                      disabled={!csvData || isProcessing || isEnrichingImages}
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                      Column Constraints
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      disabled={!csvData || isProcessing || isEnrichingImages}
                    >
                      Download CSV
                    </Button>
                  </div>
                </div>
                
                {/* Processing Progress */}
                {(isProcessing || isEnrichingImages) && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-[#008DC1] h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${processingProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      {isProcessing ? "Processing data" : "Fetching images"}... {processingProgress}%
                    </p>
                  </div>
                )}
              </div>
              
              {/* Table Preview Component */}
              <div className="mt-4">
                <DataTable data={csvData} />
              </div>
              
              {/* Column Constraints Editor Modal */}
              {showConstraintsEditor && csvData && csvData.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <ColumnConstraintsEditor
                      csvHeaders={Object.keys(csvData[0])}
                      onConstraintsChange={setColumnConstraints}
                      onClose={() => setShowConstraintsEditor(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex justify-center mb-2">
            <Logo size="sm" withText={true} />
          </div>
          <p>Powered by Next.js, OpenAI, and Pexels</p>
          <p>Software property of © {new Date().getFullYear()} Maxiphy Solutions SARL</p>
        </div>
      </div>
    </div>
  );
}
