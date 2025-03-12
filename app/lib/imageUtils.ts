// Import types
import { CSVRow } from '../types';

// Define image result interface
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

/**
 * Fetch images from Unsplash based on product details
 * @param query The search query for images
 * @returns Promise resolving to an array of image results
 */
export async function fetchImagesFromAPI(query: string): Promise<ImageResult[]> {
  try {
    // Call the API route to fetch images
    const response = await fetch('/api/fetch-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productDetails: query }),
    });

    if (!response.ok) {
      throw new Error(`Error fetching images: ${response.statusText}`);
    }

    const data = await response.json();
    return data.images || [];
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
}

/**
 * Generate a search query for product images based on product details
 * @param product Object containing product details
 * @returns A search query string
 */
export function generateImageSearchQuery(product: CSVRow): string {
  // Log the product object to debug what fields are available
  console.log('Product data for image search:', JSON.stringify(product));
  
  // Check for Name field first
  if (product['Name'] && typeof product['Name'] === 'string' && product['Name'].trim() !== '') {
    const query = String(product['Name']).trim();
    console.log(`Generated query from Name: "${query}"`);
    return query;
  }
  
  // Check for title field as an alternative
  if (product['title'] && typeof product['title'] === 'string' && product['title'].trim() !== '') {
    const query = String(product['title']).trim();
    console.log(`Generated query from title: "${query}"`);
    return query;
  }
  
  // If neither Name nor title is available, use a generic term
  console.log('No Name or title field found, using generic "product" query');
  return 'product';
}

/**
 * Associate images with products
 * @param products Array of product objects
 * @returns Promise resolving to products with image URLs
 */
export async function enrichProductsWithImages(
  products: CSVRow[]
): Promise<CSVRow[]> {
  const enrichedProducts = [...products];
  
  // Process each product
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    // Generate search query from product details
    const searchQuery = generateImageSearchQuery(product);
    
    // Fetch images
    const images = await fetchImagesFromAPI(searchQuery);
    
    // Add image URL to product if images found
    if (images.length > 0) {
      enrichedProducts[i] = {
        ...product,
        imageUrl: images[0].url,
        imageThumb: images[0].thumb,
        imageAlt: images[0].alt,
        imageCredit: `${images[0].credit.name} (${images[0].credit.link})`,
      };
    }
  }
  
  return enrichedProducts;
}

/**
 * Batch process products to add images
 * @param products Array of product objects
 * @param batchSize Number of products to process in parallel
 * @returns Promise resolving to products with image URLs
 */
export async function batchEnrichProductsWithImages(
  products: CSVRow[],
  batchSize = 3
): Promise<CSVRow[]> {
  const results = [...products];
  // Keep track of used image IDs to prevent duplicates
  const usedImageIds = new Set<string>();
  
  // Process products in batches
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchPromises = batch.map(async (product, batchIndex) => {
      const productIndex = i + batchIndex;
      
      try {
        // Get product name for logging
        const productName = product['Name'] || product['name'] || `Product ${productIndex}`;
        
        // Generate search query from product details
        const searchQuery = generateImageSearchQuery(product);
        console.log(`Product "${productName}": Searching for images with query: "${searchQuery}"`);
        
        // Fetch images
        const images = await fetchImagesFromAPI(searchQuery);
        
        // Add image URL to product if images found
        if (images.length > 0) {
          // Find the first non-duplicate image
          const uniqueImage = images.find(img => !usedImageIds.has(img.id));
          
          if (uniqueImage) {
            // Mark this image as used
            usedImageIds.add(uniqueImage.id);
            
            results[productIndex] = {
              ...product,
              imageUrl: uniqueImage.url,
              imageThumb: uniqueImage.thumb,
              imageAlt: uniqueImage.alt,
              imageCredit: `${uniqueImage.credit.name} (${uniqueImage.credit.link})`,
            };
            console.log(`Product "${productName}": Added unique image (ID: ${uniqueImage.id})`);
          } else {
            // If all images are duplicates, use the first one anyway but add a random offset to avoid all duplicates being the same
            const randomIndex = Math.floor(Math.random() * Math.min(3, images.length));
            const selectedImage = images[randomIndex];
            
            results[productIndex] = {
              ...product,
              imageUrl: selectedImage.url,
              imageThumb: selectedImage.thumb,
              imageAlt: selectedImage.alt,
              imageCredit: `${selectedImage.credit.name} (${selectedImage.credit.link})`,
            };
            console.log(`Product "${productName}": Using image at index ${randomIndex} (ID: ${selectedImage.id}) as fallback`);
          }
        } else {
          // If no images found, just log the issue - no fallback to other fields
          console.log(`Product "${productName}": No images found with query "${searchQuery}"`);
        }
      } catch (error) {
        console.error(`Error enriching product at index ${productIndex}:`, error);
      }
      
      return productIndex;
    });
    
    // Wait for the batch to complete
    await Promise.all(batchPromises);
  }
  
  return results;
}
