"use client";

import { Toaster } from "react-hot-toast";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import TabNavigation from "../components/ui/TabNavigation";
import { useAuth } from "../context/AuthContext";
import Login from "../components/Login";
import MockDataGenerator from "../components/MockDataGenerator";
import useMockDataGenerator from "../hooks/useMockDataGenerator";
import DataTable from "../components/ui/DataTable";


export default function GeneratePage() {
  const { isAuthenticated, logout } = useAuth();
  const {
    isGenerating,
    generatedData,
    generateMockData,
    downloadGeneratedCSV,
  } = useMockDataGenerator();

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
            Generate mock data for testing and development
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="mb-8">
          <TabNavigation 
            tabs={[
              { name: 'Complete & Enrich', href: '/', current: false },
              { name: 'Generate Mock Data', href: '/generate', current: true },
              { name: 'ISRC Fixer', href: '/isrc-fixer', current: false },
            ]}
          />
        </div>


        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          {/* Generator Form */}
          <div className="col-span-1 bg-white p-8 rounded-lg shadow-md">
            <h3 className="text-base font-semibold mb-4 text-gray-900">Generate Mock Data</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
              <MockDataGenerator 
                onGenerateMockData={generateMockData}
                isGenerating={isGenerating}
              />
            </div>
          </div>
          
          {/* Generated Data Preview */}
          {generatedData && (
            <div className="col-span-1 bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-gray-900">Generated Data Preview</h3>
                <Button 
                  variant="primary" 
                  onClick={downloadGeneratedCSV}
                  disabled={!generatedData}
                  className="h-10 flex items-center justify-center"
                >
                  Download CSV
                </Button>
              </div>
              <DataTable data={generatedData} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex justify-center mb-2">
            <Logo size="sm" withText={true} />
          </div>
          <p>Powered by Next.js, OpenAI, and Pexels</p>
          <p>Software property of {new Date().getFullYear()} Maxiphy Solutions SARL</p>
        </div>
      </div>
    </div>
  );
}
