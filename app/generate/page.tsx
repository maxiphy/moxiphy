"use client";

import { Toaster } from "react-hot-toast";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import { useAuth } from "../context/AuthContext";
import Login from "../components/Login";
import MockDataGenerator from "../components/MockDataGenerator";
import useMockDataGenerator from "../hooks/useMockDataGenerator";
import DataTable from "../components/ui/DataTable";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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
            <div className="flex items-center space-x-4">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 sm:text-3xl">
              Generate Mock CSV Data
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Define columns and generate realistic mock data with AI
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="flex items-center">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to CSV Enrichment
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          {/* Generator Form */}
          <div className="col-span-1">
            <MockDataGenerator 
              onGenerateMockData={generateMockData}
              isGenerating={isGenerating}
            />
          </div>
          
          {/* Generated Data Preview */}
          {generatedData && (
            <div className="col-span-1 bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Generated Data Preview</h3>
                <Button 
                  variant="primary" 
                  onClick={downloadGeneratedCSV}
                  disabled={!generatedData}
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
          <p>Software property of © {new Date().getFullYear()} Maxiphy Solutions SARL</p>
        </div>
      </div>
    </div>
  );
}
