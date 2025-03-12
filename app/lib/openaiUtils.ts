import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate completions for missing fields using OpenAI
 * @param missingFields Array of field names that are missing
 * @param existingData Object containing the existing data in the row
 * @param headers Array of all column headers in the CSV
 * @returns Object with completions for the missing fields
 */
export async function generateCompletions(
  missingFields: string[],
  existingData: Record<string, string>,
  headers: string[]
): Promise<Record<string, string>> {
  try {
    // Create a prompt for OpenAI
    const prompt = createPrompt(missingFields, existingData, headers);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for Moxiphy, a tool that generates and enhances mock data for Maxiphy company. Complete missing data in CSV files with realistic values. Provide only the requested information in valid JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and parse the completion
    const content = response.choices[0]?.message?.content || '{}';
    return parseCompletionResponse(content, missingFields);
  } catch (error) {
    console.error('Error generating completions:', error);
    return {};
  }
}

/**
 * Create a prompt for OpenAI to complete missing fields
 * @param missingFields Array of field names that are missing
 * @param existingData Object containing the existing data in the row
 * @param headers Array of all column headers in the CSV
 * @returns Prompt string for OpenAI
 */
function createPrompt(
  missingFields: string[],
  existingData: Record<string, string>,
  headers: string[]
): string {
  const existingDataDescription = Object.entries(existingData)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  return `I have a CSV row with the following data:
${existingDataDescription}

Please provide realistic and appropriate values for the following missing fields:
${missingFields.join(', ')}

The CSV contains the following columns:
${headers.join(', ')}

Respond with only the missing values in a JSON format where the keys are the field names and the values are your suggestions.`;
}

/**
 * Parse the completion response from OpenAI
 * @param content The response content from OpenAI
 * @param missingFields Array of field names that are missing
 * @returns Object with completions for the missing fields
 */
function parseCompletionResponse(
  content: string,
  missingFields: string[]
): Record<string, string> {
  try {
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || content.match(/```\n([\s\S]*)\n```/) || [null, content];
    const jsonString = jsonMatch[1] || content;
    const completions = JSON.parse(jsonString.trim());
    
    // Ensure we only have the missing fields in the completions
    const filteredCompletions: Record<string, string> = {};
    for (const field of missingFields) {
      if (completions[field]) {
        filteredCompletions[field] = completions[field];
      }
    }
    
    return filteredCompletions;
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    console.log('Raw response:', content);
    return {};
  }
}

/**
 * Process multiple rows with missing data in a single API call
 * @param rows Array of rows with missing data
 * @param headers Array of all column headers in the CSV
 * @returns Array of completed rows
 */
export async function batchProcessRows(
  rows: any[],
  headers: string[]
): Promise<any[]> {
  const results = [...rows];
  
  // Identify rows with missing fields
  const rowsWithMissingFields = rows.map((row, index) => {
    const missingFields: string[] = [];
    const existingData: Record<string, string> = {};
    
    for (const key of Object.keys(row)) {
      if (!row[key]) {
        missingFields.push(key);
      } else {
        existingData[key] = row[key];
      }
    }
    
    return { row, index, missingFields, existingData, hasEmptyFields: missingFields.length > 0 };
  }).filter(item => item.hasEmptyFields);
  
  // If no rows have missing fields, return the original data
  if (rowsWithMissingFields.length === 0) {
    return results;
  }
  
  try {
    // Create a single prompt for all rows with missing data
    const prompt = createBatchPrompt(rowsWithMissingFields, headers);
    
    console.log('Sending batch request to OpenAI for', rowsWithMissingFields.length, 'rows with missing data');
    
    // Make a single API call for all rows
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for Moxiphy, a tool that generates and enhances mock data for Maxiphy company. Complete missing data in CSV files with realistic values. Your response must be valid JSON with an array of objects, each containing rowIndex and fields properties. The rowIndex must match the index provided in the request, and fields should be an object with keys matching the missing field names and values being your completions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    // Parse the response
    const content = response.choices[0]?.message?.content || '[]';
    console.log('Raw OpenAI response:', content);
    
    const completions = parseBatchCompletionResponse(content);
    console.log('Parsed completions:', JSON.stringify(completions, null, 2));
    
    // Update rows with completions
    for (const completion of completions) {
      const { rowIndex, fields } = completion;
      if (rowIndex >= 0 && rowIndex < results.length && fields) {
        console.log(`Updating row ${rowIndex} with fields:`, fields);
        results[rowIndex] = { ...results[rowIndex], ...fields };
      } else {
        console.warn(`Invalid completion for row ${rowIndex}:`, fields);
      }
    }
    
    // Manual fallback: If no completions were parsed correctly, try to extract data directly
    if (completions.length === 0 && content.length > 0) {
      console.log('No completions parsed, attempting manual extraction...');
      try {
        // Try to find any JSON-like structures in the response
        const jsonMatches = content.match(/\{[\s\S]*?\}/g) || [];
        for (const jsonStr of jsonMatches) {
          try {
            const obj = JSON.parse(jsonStr);
            if (obj && typeof obj === 'object') {
              // Try to match this to a row
              for (let i = 0; i < rowsWithMissingFields.length; i++) {
                const rowData = rowsWithMissingFields[i];
                const missingFields = rowData.missingFields;
                const rowIndex = rowData.index;
                
                // Check if this object has any of our missing fields
                const fieldsToAdd: Record<string, string> = {};
                let hasFields = false;
                
                for (const field of missingFields) {
                  if (obj[field] && typeof obj[field] === 'string') {
                    fieldsToAdd[field] = obj[field];
                    hasFields = true;
                  }
                }
                
                if (hasFields) {
                  console.log(`Manually extracted fields for row ${rowIndex}:`, fieldsToAdd);
                  results[rowIndex] = { ...results[rowIndex], ...fieldsToAdd };
                }
              }
            }
          } catch (e) {
            // Ignore parsing errors for individual matches
          }
        }
      } catch (e) {
        console.error('Error in manual extraction:', e);
      }
    }
  } catch (error) {
    console.error('Error processing batch:', error);
  }
  
  return results;
}

/**
 * Create a batch prompt for OpenAI to complete missing fields for multiple rows
 * @param rowsData Array of row data with missing fields
 * @param headers Array of all column headers in the CSV
 * @returns Prompt string for OpenAI
 */
function createBatchPrompt(
  rowsData: Array<{row: Record<string, string>, index: number, missingFields: string[], existingData: Record<string, string>}>,
  headers: string[]
): string {
  const rowPrompts = rowsData.map((rowData, i) => {
    const { index, existingData, missingFields } = rowData;
    
    const existingDataDescription = Object.entries(existingData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    return `ROW ${i + 1} (index: ${index}):\n` +
           `Available information:\n${existingDataDescription}\n\n` +
           `Missing fields to complete:\n${missingFields.join(', ')}\n`;
  }).join('\n----------\n\n');
  
  return `I have a CSV file with the following columns:\n${headers.join(', ')}\n\n` +
         `Please complete the missing fields for ${rowsData.length} rows:\n\n${rowPrompts}\n\n` +
         `Respond with a JSON array of objects. Each object should have a 'rowIndex' property matching the index provided, and a 'fields' property containing an object with the missing field names and their values.\n` +
         `Example response format:\n` +
         `[\n` +
         `  { "rowIndex": 0, "fields": { "field1": "value1", "field2": "value2" } },\n` +
         `  { "rowIndex": 2, "fields": { "field1": "value3", "field3": "value4" } }\n` +
         `]`;
}

/**
 * Parse the batch completion response from OpenAI
 * @param content The response content from OpenAI
 * @returns Array of row completions
 */
function parseBatchCompletionResponse(content: string): Array<{rowIndex: number, fields: Record<string, string>}> {
  try {
    // Clean up the content - remove any text before or after the JSON array
    let cleanedContent = content.trim();
    
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = cleanedContent.match(/```(?:json)?\n([\s\S]*)\n```/) || cleanedContent.match(/```([\s\S]*)```/) || [null, cleanedContent];
    let jsonString = jsonMatch[1] || cleanedContent;
    
    // Further cleanup - sometimes there's explanatory text before or after the JSON
    const arrayStartIndex = jsonString.indexOf('[');
    const arrayEndIndex = jsonString.lastIndexOf(']');
    
    if (arrayStartIndex >= 0 && arrayEndIndex > arrayStartIndex) {
      jsonString = jsonString.substring(arrayStartIndex, arrayEndIndex + 1);
    }
    
    console.log('Cleaned JSON string:', jsonString);
    
    // Parse the JSON response
    const completions = JSON.parse(jsonString.trim());
    
    // Validate the structure
    if (!Array.isArray(completions)) {
      throw new Error('Response is not an array');
    }
    
    return completions.map(item => {
      // Ensure each item has the required properties
      if (typeof item !== 'object' || item === null) {
        console.error('Item is not an object:', item);
        return { rowIndex: -1, fields: {} };
      }
      
      // Handle string rowIndex by converting to number
      let rowIndex = item.rowIndex;
      if (typeof rowIndex === 'string') {
        rowIndex = parseInt(rowIndex, 10);
      }
      
      if (typeof rowIndex !== 'number' || isNaN(rowIndex)) {
        console.error('Invalid rowIndex:', rowIndex);
        return { rowIndex: -1, fields: {} };
      }
      
      if (typeof item.fields !== 'object' || item.fields === null) {
        console.error('Invalid fields property:', item.fields);
        return { rowIndex, fields: {} };
      }
      
      // Convert fields to string values if they're not already
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(item.fields)) {
        fields[key] = String(value);
      }
      
      return { rowIndex, fields };
    }).filter(item => item.rowIndex >= 0);
  } catch (error) {
    console.error('Error parsing batch response:', error);
    console.log('Raw response:', content);
    return [];
  }
}
