import { NextRequest, NextResponse } from 'next/server';
import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';

// Initialize Unsplash client with fallback for build-time
let unsplash: ReturnType<typeof createApi>;

try {
  unsplash = createApi({
    accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
    fetch: nodeFetch as unknown as typeof fetch,
  });
} catch (error) {
  console.error('Error initializing Unsplash client:', error);
  // Provide a dummy client for build time
  unsplash = {
    search: {
      getPhotos: () => Promise.resolve({ type: 'error', errors: ['API not initialized'] }),
    },
  } as unknown as ReturnType<typeof createApi>;
}

// Helper function to enhance search queries for better image results
function enhanceSearchQuery(query: string): string {
  // Remove any generic terms that might dilute the search
  const termsToRemove = ['product', 'item', 'the', 'a', 'an'];
  
  let enhancedQuery = query;
  termsToRemove.forEach(term => {
    // Remove the term if it's a whole word
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    enhancedQuery = enhancedQuery.replace(regex, '');
  });
  
  // Clean up extra spaces
  enhancedQuery = enhancedQuery.replace(/\s+/g, ' ').trim();
  
  // If query became too short, return the original
  if (enhancedQuery.length < 3) {
    return query;
  }
  
  return enhancedQuery;
}

// Helper function to simplify a query when no results are found
function simplifyQuery(query: string): string {
  // Split the query into words
  const words = query.split(' ');
  
  // If we have multiple words, just use the first 1-2 significant words
  if (words.length > 2) {
    // Filter out short words (likely articles or prepositions)
    const significantWords = words.filter(word => word.length > 3);
    if (significantWords.length > 0) {
      // Take up to 2 significant words
      return significantWords.slice(0, 2).join(' ');
    }
    // If no significant words, just take the first 2
    return words.slice(0, 2).join(' ');
  }
  
  // If it's already 1-2 words, return as is
  return query;
}

export async function POST(request: NextRequest) {
  try {
    const { productDetails } = await request.json();

    console.log(`Image search query received: "${productDetails}"`);

    if (!productDetails || typeof productDetails !== 'string') {
      return NextResponse.json(
        { error: 'Invalid product details provided' },
        { status: 400 }
      );
    }

    // Determine which image API to use based on available API keys
    if (process.env.UNSPLASH_ACCESS_KEY) {
      const images = await fetchImagesFromUnsplash(productDetails);
      return NextResponse.json({ images });
    } else if (process.env.PEXELS_API_KEY) {
      const images = await fetchImagesFromPexels(productDetails);
      return NextResponse.json({ images });
    } else {
      return NextResponse.json(
        { error: 'No image API keys configured' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// Helper function to fetch images from Unsplash
async function fetchImagesFromUnsplash(query: string) {
  try {
    // Clean and enhance the query for better results
    const enhancedQuery = enhanceSearchQuery(query);
    console.log(`Enhanced Unsplash query: "${enhancedQuery}"`);
    
    // Use page 1 for more relevant results, randomization was causing issues
    const result = await unsplash.search.getPhotos({
      query: enhancedQuery,
      page: 1,
      perPage: 10,
      orientation: 'landscape',
    });

    if (result.errors) {
      console.error('Unsplash API errors:', result.errors);
      return [];
    }
    
    // Log the number of results found
    console.log(`Unsplash found ${result.response?.results.length || 0} images for query: "${enhancedQuery}"`);
    
    // If no results, try a simplified query
    if (!result.response?.results.length) {
      const simplifiedQuery = simplifyQuery(query);
      console.log(`No results, trying simplified query: "${simplifiedQuery}"`);
      
      const retryResult = await unsplash.search.getPhotos({
        query: simplifiedQuery,
        page: 1,
        perPage: 10,
        orientation: 'landscape',
      });
      
      if (retryResult.response?.results.length) {
        console.log(`Simplified query found ${retryResult.response.results.length} images`);
        return retryResult.response.results.map((photo) => ({
          id: photo.id,
          url: photo.urls.regular,
          thumb: photo.urls.thumb,
          alt: photo.alt_description || simplifiedQuery,
          credit: {
            name: photo.user.name,
            link: photo.user.links.html,
          },
        }));
      }
    }

    return result.response?.results.map((photo) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      alt: photo.alt_description || query,
      credit: {
        name: photo.user.name,
        link: photo.user.links.html,
      },
    })) || [];
  } catch (error) {
    console.error('Error in Unsplash API call:', error);
    return [];
  }
}

// Helper function to fetch images from Pexels
async function fetchImagesFromPexels(query: string) {
  try {
    // Clean and enhance the query for better results
    const enhancedQuery = enhanceSearchQuery(query);
    console.log(`Enhanced Pexels query: "${enhancedQuery}"`);
    
    // Use page 1 for more relevant results, randomization was causing issues
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(enhancedQuery)}&per_page=10&page=1&orientation=landscape`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log the number of results found
    console.log(`Pexels found ${data.photos?.length || 0} images for query: "${enhancedQuery}"`);
    
    // If no results, try a simplified query
    if (!data.photos?.length) {
      const simplifiedQuery = simplifyQuery(query);
      console.log(`No results, trying simplified query: "${simplifiedQuery}"`);
      
      const retryResponse = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(simplifiedQuery)}&per_page=10&page=1&orientation=landscape`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY || '',
          },
        }
      );
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (retryData.photos?.length) {
          console.log(`Simplified query found ${retryData.photos.length} images`);
          return retryData.photos.map((photo: any) => ({
            id: photo.id.toString(),
            url: photo.src.large,
            thumb: photo.src.medium,
            alt: simplifiedQuery,
            credit: {
              name: photo.photographer,
              link: photo.photographer_url,
            },
          }));
        }
      }
    }

    return data.photos.map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.src.large,
      thumb: photo.src.medium,
      alt: query,
      credit: {
        name: photo.photographer,
        link: photo.photographer_url,
      },
    }));
  } catch (error) {
    console.error('Error in Pexels API call:', error);
    return [];
  }
}
