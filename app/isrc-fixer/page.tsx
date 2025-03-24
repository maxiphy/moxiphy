"use client";

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from "../context/AuthContext";

// UI Components
import Login from "../components/Login";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";
import TabNavigation from "../components/ui/TabNavigation";
import DataTable from "../components/ui/DataTable";
import Spinner from '@/app/components/ui/Spinner';
import ProgressBar from '@/app/components/ui/ProgressBar';

// Define types for our data
interface ToFixRow {
  songid: string;
  'song name': string;
  artist: string;
  'wrong isrc': string;
  'Correct ISRC': string;
  'Watary Label': string;
  similarityScore?: number;
  matchMethod?: string;
  matchReasoning?: string;
  [key: string]: string | number | undefined; // Add index signature for DataTable compatibility
}

interface CatalogueRow {
  Month: string;
  'Label Name': string;
  'Track Name': string;
  ISRC: string;
  Artists: string;
  'Label ID': string;
  [key: string]: string | undefined; // Add index signature for flexibility
}

export default function ISRCFixer() {
  const { isAuthenticated, logout } = useAuth();
  const [toFixData, setToFixData] = useState<ToFixRow[] | null>(null);
  const [catalogueData, setCatalogueData] = useState<CatalogueRow[] | null>(null);
  const [matchedData, setMatchedData] = useState<ToFixRow[]>([]);
  const [notFoundData, setNotFoundData] = useState<ToFixRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [aiConfidenceThreshold, setAIConfidenceThreshold] = useState<number>(0.7);

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <Login />;
  }

  // Function to clean song name by removing text in parentheses
  const cleanSongName = (songName: string | undefined): string => {
    if (!songName) return '';
    return songName.replace(/\([^)]*\)/g, '').trim();
  };

  // Function to handle file upload for to_fix.csv
  const handleToFixFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Convert parsed data to ToFixRow format
        const parsedData = results.data as Record<string, string>[];
        const formattedData: ToFixRow[] = parsedData.map(row => ({
          songid: row.songid || '',
          'song name': row['song name'] || '',
          artist: row.artist || '',
          'wrong isrc': row['wrong isrc'] || '',
          'Correct ISRC': row['Correct ISRC'] || '',
          'Watary Label': row['Watary Label'] || '',
          ...row // Include any other fields that might be present
        }));
        
        setToFixData(formattedData);
        toast.success(`Loaded ${formattedData.length} rows from ${file.name}`);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    });
  };

  // Function to handle file upload for catalogue.csv
  const handleCatalogueFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CatalogueRow[];
        setCatalogueData(data);
        toast.success(`Loaded ${data.length} rows from ${file.name}`);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    });
  };

  // Function to start matching process
  const startMatching = async () => {
    // If we're resuming, use the existing data
    if (isPaused) {
      setIsPaused(false);
      toast.loading('Resuming ISRC matching...', { id: 'matching' });
      // Use the new artist-based matching approach
      await processFiles();
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setIsPaused(false);
    toast.loading('Matching ISRC codes...', { id: 'matching' });

    // Use the new artist-based matching approach
    await processFiles();
  };

  // Function to match ISRC codes
  const matchISRCCodes = async () => {
    if (!toFixData || !catalogueData) {
      toast.error('Please upload both files first');
      return;
    }

    try {
      setIsProcessing(true);
      setIsPaused(false);
      setProcessingProgress(0);
      setMatchedData([]);
      setNotFoundData([]);
      
      // Initialize empty arrays for tracking matches and not found
      const matchedTracksArray: ToFixRow[] = [];
      const notFoundTracksArray: ToFixRow[] = [];
      
      // Group artists from to-fix file
      const toFixArtistGroups = groupArtists(toFixData);
      console.log(`Grouped to-fix rows into ${toFixArtistGroups.size} artist groups`);
      
      // Group catalogue rows by normalized artist name
      const catalogueArtistGroups = groupCatalogueArtists(catalogueData);
      
      // Process each artist group
      const artistGroups = Array.from(toFixArtistGroups.keys());
      let processedArtists = 0;
      
      for (const normalizedArtist of artistGroups) {
        if (isPaused) {
          console.log('Processing paused');
          break;
        }
        
        const toFixRows = toFixArtistGroups.get(normalizedArtist) || [];
        
        // Find similar artists in catalogue
        const similarArtists = new Set<string>();
        similarArtists.add(normalizedArtist);
        
        // Improved artist matching for collaborations
        for (const catalogueArtist of catalogueArtistGroups.keys()) {
          // Check for exact match
          if (catalogueArtist === normalizedArtist) {
            similarArtists.add(catalogueArtist);
            continue;
          }
          
          // Check for substring match (one artist contains the other)
          if (
            catalogueArtist.includes(normalizedArtist) || 
            normalizedArtist.includes(catalogueArtist)
          ) {
            similarArtists.add(catalogueArtist);
            continue;
          }
          
          // Check for word-level match (for short artist names)
          if (normalizedArtist.length > 3 && catalogueArtist.length > 3) {
            const artistWords = normalizedArtist.split(' ');
            const catalogueWords = catalogueArtist.split(' ');
            
            // Check if any significant word matches (ignore very short words)
            const hasWordMatch = artistWords.some(word => 
              word.length > 3 && catalogueWords.some(cWord => cWord === word)
            );
            
            if (hasWordMatch) {
              similarArtists.add(catalogueArtist);
            }
          }
        }
        
        // Collect all catalogue rows for similar artists
        const catalogueRows: CatalogueRow[] = [];
        for (const similarArtist of similarArtists) {
          const rows = catalogueArtistGroups.get(similarArtist);
          if (rows) {
            catalogueRows.push(...rows);
          }
        }
        
        if (catalogueRows.length === 0) {
          // No matching artists found in catalogue
          for (const row of toFixRows) {
            row['Correct ISRC'] = 'Artist not in catalogue';
            row.similarityScore = 0;
            row.matchMethod = 'No Match';
            row.matchReasoning = 'Artist not found in catalogue';
            notFoundTracksArray.push({ ...row });
          }
          setProcessingProgress(prev => prev + toFixRows.length);
          continue;
        }
        
        console.log(`Processing artist "${normalizedArtist}" with ${toFixRows.length} tracks to fix and ${catalogueRows.length} potential catalogue matches`);
        
        // Send to AI for matching
        try {
          // Get PIN directly from environment variable
          const pin = process.env.NEXT_PUBLIC_ACCESS_PIN;
          
          const response = await fetch('/api/artist-match', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${pin || ''}`, // Use PIN directly for now
            },
            body: JSON.stringify({
              toFixRows,
              catalogueRows,
              maxCatalogueRows: 100 // Limit to avoid token limits
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const matchResults = await response.json();
          
          // Process match results
          for (const result of matchResults.matches) {
            const toFixRow = toFixRows.find(r => 
              r['song name'] === result.toFixTrack.songName && 
              r.artist === result.toFixTrack.artist
            );
            
            if (toFixRow) {
              if (result.matched) {
                // Found a match
                toFixRow['Correct ISRC'] = result.catalogueTrack.isrc;
                toFixRow.similarityScore = result.confidence;
                toFixRow.matchMethod = 'AI (Artist Group)';
                toFixRow.matchReasoning = result.reasoning;
                matchedTracksArray.push({ ...toFixRow });
              } else {
                // No match found
                toFixRow['Correct ISRC'] = 'Track not in catalogue';
                toFixRow.similarityScore = 0;
                toFixRow.matchMethod = 'No Match';
                toFixRow.matchReasoning = result.reasoning;
                notFoundTracksArray.push({ ...toFixRow });
              }
              setProcessingProgress(prev => prev + 1);
            }
          }
          
        } catch (error) {
          console.error(`Error matching artist "${normalizedArtist}":`, error);
          // Mark all tracks for this artist as errors
          for (const row of toFixRows) {
            row['Correct ISRC'] = 'Error in AI matching';
            row.similarityScore = 0;
            row.matchMethod = 'Error';
            row.matchReasoning = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            notFoundTracksArray.push({ ...row });
            setProcessingProgress(prev => prev + 1);
          }
        }
        
        // Update state with current results
        setMatchedData(matchedTracksArray);
        setNotFoundData(notFoundTracksArray);
        
        processedArtists++;
        setProcessingProgress(Math.round((processedArtists / artistGroups.length) * 100));
        
        // Add a small delay to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      if (!isPaused) {
        setIsProcessing(false);
        toast.success('Processing complete!');
      } else {
        toast('Processing paused', { icon: '⏸️' });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Function to process the files and match ISRCs
  const processFiles = async () => {
    if (!toFixData || !catalogueData) {
      toast.error('Please upload both files first');
      return;
    }

    try {
      setIsProcessing(true);
      setIsPaused(false);
      setProcessingProgress(0);
      setMatchedData([]);
      setNotFoundData([]);
      
      // Initialize empty arrays for tracking matches and not found
      const matchedTracksArray: ToFixRow[] = [];
      const notFoundTracksArray: ToFixRow[] = [];
      
      // Group artists from to-fix file
      const toFixArtistGroups = groupArtists(toFixData);
      console.log(`Grouped to-fix rows into ${toFixArtistGroups.size} artist groups`);
      
      // Group catalogue rows by normalized artist name
      const catalogueArtistGroups = groupCatalogueArtists(catalogueData);
      
      // Process each artist group
      const artistGroups = Array.from(toFixArtistGroups.keys());
      let processedArtists = 0;
      
      for (const normalizedArtist of artistGroups) {
        if (isPaused) {
          console.log('Processing paused');
          break;
        }
        
        const toFixRows = toFixArtistGroups.get(normalizedArtist) || [];
        
        // Find similar artists in catalogue
        const similarArtists = new Set<string>();
        similarArtists.add(normalizedArtist);
        
        // Improved artist matching for collaborations
        for (const catalogueArtist of catalogueArtistGroups.keys()) {
          // Check for exact match
          if (catalogueArtist === normalizedArtist) {
            similarArtists.add(catalogueArtist);
            continue;
          }
          
          // Check for substring match (one artist contains the other)
          if (
            catalogueArtist.includes(normalizedArtist) || 
            normalizedArtist.includes(catalogueArtist)
          ) {
            similarArtists.add(catalogueArtist);
            continue;
          }
          
          // Check for word-level match (for short artist names)
          if (normalizedArtist.length > 3 && catalogueArtist.length > 3) {
            const artistWords = normalizedArtist.split(' ');
            const catalogueWords = catalogueArtist.split(' ');
            
            // Check if any significant word matches (ignore very short words)
            const hasWordMatch = artistWords.some(word => 
              word.length > 3 && catalogueWords.some(cWord => cWord === word)
            );
            
            if (hasWordMatch) {
              similarArtists.add(catalogueArtist);
            }
          }
        }
        
        // Collect all catalogue rows for similar artists
        const catalogueRows: CatalogueRow[] = [];
        for (const similarArtist of similarArtists) {
          const rows = catalogueArtistGroups.get(similarArtist);
          if (rows) {
            catalogueRows.push(...rows);
          }
        }
        
        if (catalogueRows.length === 0) {
          // No matching artists found in catalogue
          for (const row of toFixRows) {
            row['Correct ISRC'] = 'Artist not in catalogue';
            row.similarityScore = 0;
            row.matchMethod = 'No Match';
            row.matchReasoning = 'Artist not found in catalogue';
            notFoundTracksArray.push({ ...row });
          }
          setProcessingProgress(prev => prev + toFixRows.length);
          continue;
        }
        
        console.log(`Processing artist "${normalizedArtist}" with ${toFixRows.length} tracks to fix and ${catalogueRows.length} potential catalogue matches`);
        
        // Send to AI for matching
        try {
          // Get PIN directly from environment variable
          const pin = process.env.NEXT_PUBLIC_ACCESS_PIN;
          
          const response = await fetch('/api/artist-match', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${pin || ''}`, // Use PIN directly for now
            },
            body: JSON.stringify({
              toFixRows,
              catalogueRows,
              maxCatalogueRows: 100 // Limit to avoid token limits
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const matchResults = await response.json();
          
          // Process match results
          for (const result of matchResults.matches) {
            const toFixRow = toFixRows.find(r => 
              r['song name'] === result.toFixTrack.songName && 
              r.artist === result.toFixTrack.artist
            );
            
            if (toFixRow) {
              if (result.matched) {
                // Found a match
                toFixRow['Correct ISRC'] = result.catalogueTrack.isrc;
                toFixRow.similarityScore = result.confidence;
                toFixRow.matchMethod = 'AI (Artist Group)';
                toFixRow.matchReasoning = result.reasoning;
                matchedTracksArray.push({ ...toFixRow });
              } else {
                // No match found
                toFixRow['Correct ISRC'] = 'Track not in catalogue';
                toFixRow.similarityScore = 0;
                toFixRow.matchMethod = 'No Match';
                toFixRow.matchReasoning = result.reasoning;
                notFoundTracksArray.push({ ...toFixRow });
              }
              setProcessingProgress(prev => prev + 1);
            }
          }
          
        } catch (error) {
          console.error(`Error matching artist "${normalizedArtist}":`, error);
          // Mark all tracks for this artist as errors
          for (const row of toFixRows) {
            row['Correct ISRC'] = 'Error in AI matching';
            row.similarityScore = 0;
            row.matchMethod = 'Error';
            row.matchReasoning = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            notFoundTracksArray.push({ ...row });
            setProcessingProgress(prev => prev + 1);
          }
        }
        
        // Update state with current results
        setMatchedData(matchedTracksArray);
        setNotFoundData(notFoundTracksArray);
        
        processedArtists++;
        setProcessingProgress(Math.round((processedArtists / artistGroups.length) * 100));
        
        // Add a small delay to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      if (!isPaused) {
        setIsProcessing(false);
        toast.success('Processing complete!');
      } else {
        toast('Processing paused', { icon: '⏸️' });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to group artists from to-fix file
  const groupArtists = (toFixData: ToFixRow[]) => {
    const toFixArtistGroups = new Map<string, ToFixRow[]>();
    
    // Function to normalize artist names
    const normalizeArtist = (artist: string): string => {
      return artist.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')    // Normalize spaces
        .trim();
    };
    
    // Function to split collaborating artists
    const splitCollaboratingArtists = (artist: string): string[] => {
      // Common collaboration indicators
      const collaborationIndicators = [
        ' and ', ' & ', ' feat. ', ' ft. ', ' featuring ', ' with ', ' vs ', ' versus ', ' x ', ' + '
      ];
      
      let normalizedArtist = normalizeArtist(artist);
      let artists = [normalizedArtist]; // Start with the full artist name
      
      // Split by collaboration indicators
      for (const indicator of collaborationIndicators) {
        const newArtists: string[] = [];
        
        for (const currentArtist of artists) {
          if (currentArtist.includes(indicator)) {
            // Split by this indicator and normalize each part
            const parts = currentArtist.split(indicator).map(part => normalizeArtist(part));
            newArtists.push(...parts);
          } else {
            newArtists.push(currentArtist);
          }
        }
        
        artists = newArtists;
      }
      
      // Remove duplicates and empty strings
      return [...new Set(artists)].filter(a => a.length > 0);
    };
    
    // Group to-fix rows by normalized artist name and by individual artists in collaborations
    for (const row of toFixData) {
      const artist = row.artist || '';
      const artistVariations = splitCollaboratingArtists(artist);
      
      // Add the row to each artist's group
      for (const artistVariation of artistVariations) {
        if (!toFixArtistGroups.has(artistVariation)) {
          toFixArtistGroups.set(artistVariation, []);
        }
        
        toFixArtistGroups.get(artistVariation)!.push(row);
      }
    }
    
    return toFixArtistGroups;
  };

  // Function to group catalogue rows by artist, handling collaborations
  const groupCatalogueArtists = (catalogueData: CatalogueRow[]) => {
    const catalogueArtistGroups = new Map<string, CatalogueRow[]>();
    
    // Function to normalize artist names
    const normalizeArtist = (artist: string): string => {
      return artist.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')    // Normalize spaces
        .trim();
    };
    
    // Function to split collaborating artists
    const splitCollaboratingArtists = (artist: string): string[] => {
      // Common collaboration indicators
      const collaborationIndicators = [
        ' and ', ' & ', ' feat. ', ' ft. ', ' featuring ', ' with ', ' vs ', ' versus ', ' x ', ' + '
      ];
      
      let normalizedArtist = normalizeArtist(artist);
      let artists = [normalizedArtist]; // Start with the full artist name
      
      // Split by collaboration indicators
      for (const indicator of collaborationIndicators) {
        const newArtists: string[] = [];
        
        for (const currentArtist of artists) {
          if (currentArtist.includes(indicator)) {
            // Split by this indicator and normalize each part
            const parts = currentArtist.split(indicator).map(part => normalizeArtist(part));
            newArtists.push(...parts);
          } else {
            newArtists.push(currentArtist);
          }
        }
        
        artists = newArtists;
      }
      
      // Remove duplicates and empty strings
      return [...new Set(artists)].filter(a => a.length > 0);
    };
    
    for (const row of catalogueData) {
      const artist = row.Artists || '';
      const artistVariations = splitCollaboratingArtists(artist);
      
      // Add the row to each artist's group
      for (const artistVariation of artistVariations) {
        if (!catalogueArtistGroups.has(artistVariation)) {
          catalogueArtistGroups.set(artistVariation, []);
        }
        
        catalogueArtistGroups.get(artistVariation)!.push(row);
      }
    }
    
    return catalogueArtistGroups;
  };

  // Function to pause matching
  const pauseMatching = () => {
    setIsPaused(true);
    // The actual pause happens in the processFiles function
    toast.loading('Pausing after current batch completes...', { id: 'pausing' });
  };
  
  // Function to resume matching
  const resumeMatching = () => {
    matchISRCCodes();
  };

  // Function to download matched data as CSV
  const downloadMatchedData = () => {
    if (matchedData.length === 0) return;
    
    try {
      const csvString = Papa.unparse(matchedData);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'matched_tracks.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloaded matched tracks');
    } catch (error) {
      console.error('Error downloading matched data:', error);
      toast.error('Failed to download matched tracks');
    }
  };

  // Function to download not found data as CSV
  const downloadNotFoundData = () => {
    if (notFoundData.length === 0) return;
    
    try {
      const csvString = Papa.unparse(notFoundData);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'not_found_tracks.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloaded not found tracks');
    } catch (error) {
      console.error('Error downloading not found data:', error);
      toast.error('Failed to download not found tracks');
    }
  };

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
            ISRC Code Fixer
          </h2>
          <p className="mt-2 text-xs text-gray-600">
            Match and correct ISRC codes from your music database
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="mb-8">
          <TabNavigation 
            tabs={[
              { name: 'Complete & Enrich', href: '/', current: false },
              { name: 'Generate Mock Data', href: '/generate', current: false },
              { name: 'ISRC Fixer', href: '/isrc-fixer', current: true },
            ]}
          />
        </div>

        {/* Main Content */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8">
          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">Upload to_fix.csv</h3>
              <p className="text-xs text-gray-600 mb-4">
                Contains song IDs, names, artists, wrong ISRC codes, and labels
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleToFixFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-[#008DC1] file:text-white
                  hover:file:bg-[#007aa8]"
              />
              {toFixData && (
                <p className="mt-2 text-xs text-green-600">
                  Loaded {toFixData.length} rows
                </p>
              )}
            </div>
            
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">Upload catalogue.csv</h3>
              <p className="text-xs text-gray-600 mb-4">
                Contains track names, correct ISRC codes, artists, and labels
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCatalogueFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-[#008DC1] file:text-white
                  hover:file:bg-[#007aa8]"
              />
              {catalogueData && (
                <p className="mt-2 text-xs text-green-600">
                  Loaded {catalogueData.length} rows
                </p>
              )}
            </div>
          </div>
          
          {/* Settings and Actions */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              {!isProcessing && !isPaused && (
                <button
                  onClick={startMatching}
                  disabled={!toFixData || !catalogueData}
                  className={`px-4 py-2 rounded-md ${
                    !toFixData || !catalogueData
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Match ISRC Codes
                </button>
              )}
              
              {isProcessing && !isPaused && (
                <button
                  onClick={pauseMatching}
                  className="px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Pause Matching
                </button>
              )}
              
              {isPaused && (
                <button
                  onClick={resumeMatching}
                  className="px-4 py-2 rounded-md bg-green-500 hover:bg-green-600 text-white"
                >
                  Resume Matching
                </button>
              )}
              
              {(isProcessing || isPaused) && (
                <div className="flex items-center ml-4">
                  <Spinner size="sm" />
                  <span className="ml-2">
                    {isPaused ? 'Paused' : 'Processing'}: {processingProgress}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Processing Progress */}
            {(isProcessing || isPaused) && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-[#008DC1] h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-3 text-center font-medium">
                  Matching ISRC codes... {processingProgress}%
                </p>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Matching Settings</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Using AI for track name and artist matching with variations. The tool will:
              </p>
              <ol className="list-decimal ml-5 text-sm text-gray-700 dark:text-gray-300">
                <li>Take the track/song name and artist from the to-fix file</li>
                <li>Look for similar track names AND artists in the catalogue, considering common variations:</li>
                <ul className="list-disc ml-8 text-xs">
                  <li>Capitalization differences</li>
                  <li>Spacing differences</li>
                  <li>Special characters vs. regular characters</li>
                  <li>Minor spelling variations</li>
                  <li>Abbreviated words vs. full words</li>
                  <li>With/without featured artist in the title</li>
                </ul>
                <li>If found, get the ISRC code</li>
                <li>If not found, mark as "Track not in catalogue"</li>
              </ol>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                <strong>Note:</strong> Both track name AND artist must match (with variations). The tool will not match tracks with the same name but by completely different artists.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                AI Confidence Threshold: {aiConfidenceThreshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={aiConfidenceThreshold}
                onChange={(e) => setAIConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher values require more confident AI matches. Recommended: 0.7
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="primary"
                onClick={matchISRCCodes}
                disabled={!toFixData || !catalogueData || isProcessing}
                isLoading={isProcessing}
                className="h-10 flex items-center justify-center"
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <Spinner size="sm" />
                    <span className="ml-2">Processing...</span>
                  </span>
                ) : (
                  'Match ISRC Codes'
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadMatchedData}
                disabled={matchedData.length === 0 || isProcessing}
                className="h-10 flex items-center justify-center"
              >
                Download Matched
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadNotFoundData}
                disabled={notFoundData.length === 0 || isProcessing}
                className="h-10 flex items-center justify-center"
              >
                Download Not Found
              </Button>
            </div>
          </div>
          
          {/* Results Table */}
          {matchedData.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Matched Tracks</h2>
              <DataTable data={matchedData} />
            </div>
          )}
          
          {notFoundData.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Not Found Tracks</h2>
              <DataTable data={notFoundData} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex justify-center mb-2">
            <Logo size="sm" withText={true} />
          </div>
          <p>Powered by Next.js and AI Similarity Matching</p>
          <p>Software property of &copy; {new Date().getFullYear()} Maxiphy Solutions SARL</p>
        </div>
      </div>
    </div>
  );
}
