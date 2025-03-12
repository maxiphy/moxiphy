"use client";

import { Toaster } from "react-hot-toast";
import FileUpload from "./components/ui/FileUpload";
import DataTable from "./components/ui/DataTable";
import Button from "./components/ui/Button";
import Logo from "./components/ui/Logo";
import TabNavigation from "./components/ui/TabNavigation";
import { hasMissingValues } from "./lib/csvUtils";
import useCSVEnrichment from "./hooks/useCSVEnrichment";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import { useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
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
            <div className="flex items-center space-x-6">
              <a 
                href="/sample.csv" 
                download
                className="text-sm text-[#008DC1] hover:text-[#007aa8] font-medium"
              >
                Download Sample CSV
              </a>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-lg font-extrabold text-gray-900 sm:text-2xl">
            CSV Completion & Enrichment Tool
          </h2>
          <p className="mt-2 text-xs text-gray-600">
            Upload your CSV file, complete missing data with AI, and enrich with images
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="mb-8">
          <TabNavigation 
            tabs={[
              { name: 'Complete & Enrich', href: '/', current: true },
              { name: 'Generate Mock Data', href: '/generate', current: false },
            ]}
          />
        </div>

        {/* Main Content */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8">
          {/* File Upload Component */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex items-center justify-center">
            <FileUpload onFileLoaded={handleFileLoaded} onError={handleError} />
          </div>

          {/* Action Buttons and Progress Bar (above table) */}
          {csvData && (
            <div className="mt-8">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-medium text-gray-900">CSV Preview</h2>
                    <p className="text-xs text-gray-600">
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
                      className="h-10 flex items-center justify-center"
                    >
                      Complete Data
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleEnrichImages}
                      disabled={!csvData || isProcessing || isEnrichingImages}
                      isLoading={isEnrichingImages}
                      className="h-10 flex items-center justify-center"
                    >
                      Enrich with Images
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowConstraintsEditor(true)}
                      disabled={!csvData || isProcessing || isEnrichingImages}
                      className="h-10 flex items-center justify-center"
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2 text-gray-900" />
                      Column Constraints
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      disabled={!csvData || isProcessing || isEnrichingImages}
                      className="h-10 flex items-center justify-center"
                    >
                      Download CSV
                    </Button>
                  </div>
                </div>
                
                {/* Processing Progress */}
                {(isProcessing || isEnrichingImages) && (
                  <div className="mb-6 mt-6">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-[#008DC1] h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${processingProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 text-center font-medium">
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
