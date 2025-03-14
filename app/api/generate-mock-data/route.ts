import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client for server-side use only
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

interface ColumnDefinition {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  enumValues?: string[];
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { columns, rowCount } = await req.json();
    
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'Invalid columns definition' },
        { status: 400 }
      );
    }
    
    if (!rowCount || typeof rowCount !== 'number' || rowCount <= 0 || rowCount > 100) {
      return NextResponse.json(
        { error: 'Invalid row count. Must be between 1 and 100.' },
        { status: 400 }
      );
    }
    
    // Generate the data using OpenAI
    const data = await generateMockData(columns, rowCount);
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error generating mock data:', error);
    return NextResponse.json(
      { error: 'Failed to generate mock data' },
      { status: 500 }
    );
  }
}

async function generateMockData(columns: ColumnDefinition[], rowCount: number) {
  // Create a prompt for OpenAI
  const prompt = createPrompt(columns, rowCount);
  
  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini-2024-07-18",
    messages: [
      {
        role: "system",
        content: "You are a data generation assistant that creates realistic mock data based on column definitions."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" }
  });
  
  // Parse the response
  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }
  
  try {
    const parsedContent = JSON.parse(content);
    if (parsedContent.data && Array.isArray(parsedContent.data)) {
      return parsedContent.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw new Error('Failed to parse the generated data');
  }
}

function createPrompt(columns: ColumnDefinition[], rowCount: number) {
  // Create a description of the columns
  const columnDescriptions = columns.map(column => {
    let description = `"${column.name}": ${column.type}`;
    
    if (column.description) {
      description += ` (${column.description})`;
    }
    
    if (column.required) {
      description += ' [required]';
    } else {
      description += ' [optional]';
    }
    
    if (column.type === 'enum' && column.enumValues && column.enumValues.length > 0) {
      description += ` [possible values: ${column.enumValues.join(', ')}]`;
    }
    
    return description;
  }).join('\n');
  
  // Build the full prompt
  return `Generate ${rowCount} rows of realistic mock data with the following columns:

${columnDescriptions}

Requirements:
1. Return the data as a JSON object with a "data" property containing an array of objects
2. Each object should have all the column names as keys
3. For enum types, only use values from the provided list
4. For number types, provide realistic numeric values
5. For date types, provide dates in ISO format (YYYY-MM-DD)
6. For boolean types, provide true or false values
7. For text types, provide realistic text data
8. If a field is marked as optional, you may leave it empty for some rows (about 20% of the time)
9. Make the data diverse and realistic for a business context

Response format:
{
  "data": [
    { "column1": "value1", "column2": "value2", ... },
    { "column1": "value1", "column2": "value2", ... },
    ...
  ]
}`;
}
