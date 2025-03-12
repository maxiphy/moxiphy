import { NextRequest, NextResponse } from 'next/server';
import { batchProcessRows } from '../../lib/openaiUtils';
import OpenAI from 'openai';

// Initialize OpenAI client directly in the route for more control
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { csvData, headers, rowIndices, columnConstraints } = await request.json();

    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid CSV data provided' },
        { status: 400 }
      );
    }

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid headers provided' },
        { status: 400 }
      );
    }

    console.log(`Processing ${csvData.length} rows in a batch`);
    
    // Use provided row indices or default to sequential indices
    const originalIndices = rowIndices || csvData.map((_, i) => i);
    console.log('Original row indices:', originalIndices);
    
    // Identify rows with missing fields
    const rowsWithMissingFields = csvData.map((row, batchIndex) => {
      const missingFields: string[] = [];
      const existingData: Record<string, string> = {};
      
      for (const key of Object.keys(row)) {
        // Skip Image field
        if (key === 'Image') {
          existingData[key] = row[key] || ''; // Store existing image if any
          continue;
        }
        
        if (!row[key]) {
          missingFields.push(key);
        } else {
          existingData[key] = row[key];
        }
      }
      
      // Use the original index from the full dataset if provided
      const originalIndex = originalIndices[batchIndex];
      
      return { 
        row, 
        index: originalIndex, 
        batchIndex,
        missingFields, 
        existingData, 
        hasEmptyFields: missingFields.length > 0 
      };
    }).filter(item => item.hasEmptyFields);
    
    console.log(`Found ${rowsWithMissingFields.length} rows with missing fields in this batch`);
    
    if (rowsWithMissingFields.length === 0) {
      console.log('No missing fields to complete in this batch');
      return NextResponse.json({ completedData: csvData });
    }
    
    // Create a prompt for OpenAI
    const prompt = createBatchPrompt(rowsWithMissingFields, headers, columnConstraints);
    
    // Call OpenAI directly from the route
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for Moxiphy, a tool that generates and enhances mock data for Maxiphy company. Complete missing data in CSV files with realistic values. Your response must be valid JSON with an array of objects, each containing rowIndex and fields properties.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    // Extract the completion
    const content = response.choices[0]?.message?.content || '[]';
    console.log('Raw OpenAI response:', content);
    
    // Parse the response
    const completions = parseCompletionResponse(content);
    console.log('Parsed completions:', JSON.stringify(completions, null, 2));
    
    // Create a copy of the original data
    const completedData = [...csvData];
    
    // Update rows with completions
    for (const completion of completions) {
      const { rowIndex, fields } = completion;
      
      // Find the corresponding row in our batch
      const batchItem = rowsWithMissingFields.find(item => item.index === rowIndex);
      
      if (batchItem && batchItem.batchIndex >= 0 && batchItem.batchIndex < completedData.length && fields) {
        console.log(`Updating batch row ${batchItem.batchIndex} (original index ${rowIndex}) with fields:`, fields);
        completedData[batchItem.batchIndex] = { ...completedData[batchItem.batchIndex], ...fields };
      } else {
        console.warn(`Could not find batch row for original index ${rowIndex}`);
      }
    }

    console.log('Batch completion finished successfully');
    return NextResponse.json({ completedData });
  } catch (error) {
    console.error('Error completing CSV data:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV data' },
      { status: 500 }
    );
  }
}

// Helper function to create a batch prompt
function createBatchPrompt(
  rowsData: Array<{row: Record<string, string>, index: number, missingFields: string[], existingData: Record<string, string>}>,
  headers: string[],
  columnConstraints?: Array<{columnName: string, enumValues?: string[], description?: string}>
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
  
  // Build constraint information if available
  let constraintInfo = '';
  if (columnConstraints && columnConstraints.length > 0) {
    const relevantConstraints = columnConstraints.filter(c => 
      c.enumValues?.length || c.description
    );
    
    if (relevantConstraints.length > 0) {
      constraintInfo = '\nIMPORTANT COLUMN CONSTRAINTS:\n';
      
      relevantConstraints.forEach(constraint => {
        constraintInfo += `- ${constraint.columnName}: `;
        
        if (constraint.description) {
          constraintInfo += constraint.description;
        }
        
        if (constraint.enumValues && constraint.enumValues.length > 0) {
          constraintInfo += ` [MUST be one of these values: ${constraint.enumValues.join(', ')}]`;
        }
        
        constraintInfo += '\n';
      });
    }
  }

  return `I have a CSV file with the following columns:\n${headers.join(', ')}${constraintInfo}\n\n` +
         `Please complete the missing fields for ${rowsData.length} rows:\n\n${rowPrompts}\n\n` +
         `IMPORTANT: Respond with a valid JSON array of objects. Each object MUST have these two properties:\n` +
         `1. "rowIndex": (number) The index of the row as provided in the request\n` +
         `2. "fields": (object) An object containing ONLY the missing fields as keys and your completions as values\n\n` +
         `Example response format (do not include any markdown code block markers):\n` +
         `[\n` +
         `  { "rowIndex": 0, "fields": { "field1": "value1", "field2": "value2" } },\n` +
         `  { "rowIndex": 2, "fields": { "field1": "value3", "field3": "value4" } }\n` +
         `]\n\n` +
         `DO NOT include any explanation or markdown formatting in your response, ONLY the JSON array.`;
}

/**
 * Attempts to repair truncated JSON by parsing each object individually
 * @param jsonString Potentially truncated JSON string
 * @returns Repaired JSON string
 */
function repairTruncatedJson(jsonString: string): string {
  // If the string doesn't start with '[', add it
  let repairedJson = jsonString.trim();
  if (!repairedJson.startsWith('[')) {
    repairedJson = '[' + repairedJson;
  }
  
  // If the string doesn't end with ']', add it
  if (!repairedJson.endsWith(']')) {
    // Find the last complete object by looking for the last '}'  
    const lastCompleteObjectEnd = repairedJson.lastIndexOf('}');
    if (lastCompleteObjectEnd > 0) {
      repairedJson = repairedJson.substring(0, lastCompleteObjectEnd + 1) + ']';
    } else {
      // If no complete object was found, just add the closing bracket
      repairedJson += ']';
    }
  }
  
  // Replace any truncated objects at the end
  // Find pattern like ,{ ... without a closing }
  const truncatedObjectMatch = repairedJson.match(/,\s*\{[^}]*$/); 
  if (truncatedObjectMatch) {
    const truncatedStart = repairedJson.lastIndexOf(',', repairedJson.length - 1);
    if (truncatedStart > 0) {
      repairedJson = repairedJson.substring(0, truncatedStart) + ']';
    }
  }
  
  return repairedJson;
}

// Helper function to parse the completion response
function parseCompletionResponse(content: string): Array<{rowIndex: number, fields: Record<string, string>}> {
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
    
    // Handle truncated JSON by attempting to repair it
    try {
      // First try to parse as is
      const parsedCompletions = JSON.parse(jsonString.trim());
      
      // Validate the structure
      if (!Array.isArray(parsedCompletions)) {
        throw new Error('Response is not an array');
      }
      
      return processCompletions(parsedCompletions);
    } catch (parseError) {
      console.log('Initial JSON parse failed, attempting to repair truncated JSON...');
      
      // If we have a truncated string, try to parse each object individually
      const repaired = repairTruncatedJson(jsonString);
      console.log('Repaired JSON:', repaired);
      
      const repairedCompletions = JSON.parse(repaired);
      
      // Validate the structure
      if (!Array.isArray(repairedCompletions)) {
        throw new Error('Repaired response is not an array');
      }
      
      return processCompletions(repairedCompletions);
    }
  } catch (error) {
    console.error('Error parsing batch response:', error);
    console.log('Raw response:', content);
    return [];
  }
}

/**
 * Process the completions to ensure they have the correct format
 * @param completions Array of completion objects from OpenAI
 * @returns Processed completions with correct types
 */
function processCompletions(completions: any[]): Array<{rowIndex: number, fields: Record<string, string>}> {
  return completions.map((item: any) => {
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
  }).filter((item: {rowIndex: number}) => item.rowIndex >= 0);
}

// These helper functions have been moved to openaiUtils.ts
