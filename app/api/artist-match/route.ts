import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyToken } from '../auth/route';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ToFixTrack {
  songName: string;
  artist: string;
  label?: string;
}

interface CatalogueTrack {
  trackName: string;
  artist: string;
  label?: string;
  isrc: string;
}

interface MatchResult {
  toFixTrack: ToFixTrack;
  matched: boolean;
  catalogueTrack: CatalogueTrack | null;
  confidence: number;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using token
    const authHeader = request.headers.get('authorization');
    const pin = process.env.NEXT_PUBLIC_ACCESS_PIN;
    
    // Extract token from Bearer format if present
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    console.log('Artist-Match Auth Debug:', { 
      hasAuthHeader: !!authHeader,
      tokenLength: token ? token.length : 0,
      pinLength: pin ? pin.length : 0,
      isPinMatch: token === pin
    });
    
    // Simple PIN-based authentication
    if (token === pin) {
      // Authentication successful - PIN matches
      console.log('Authentication successful - PIN match');
    } else if (verifyToken(token)) {
      // Authentication successful - valid token
      console.log('Authentication successful - valid token');
    } else {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { toFixRows, catalogueRows, maxCatalogueRows = 100 } = body;

    if (!toFixRows || !catalogueRows) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Limit the number of catalogue rows to avoid token limits
    const limitedCatalogueRows = catalogueRows.slice(0, maxCatalogueRows);
    
    // If there are no catalogue rows, return immediately
    if (limitedCatalogueRows.length === 0) {
      return NextResponse.json({
        matches: toFixRows.map(row => ({
          toFixTrack: {
            songName: row['song name'] || '',
            artist: row.artist || '',
            label: row['Watary Label'] || ''
          },
          matched: false,
          catalogueTrack: null,
          confidence: 0,
          reasoning: 'No catalogue tracks provided for this artist'
        }))
      });
    }
    
    // If there are too many to-fix rows, process them in batches
    const batchSize = 10; // Process 10 tracks at a time
    const batches = [];
    
    for (let i = 0; i < toFixRows.length; i += batchSize) {
      batches.push(toFixRows.slice(i, i + batchSize));
    }
    
    const allResults: MatchResult[] = [];
    
    // Process each batch
    for (const batch of batches) {
      const prompt = `
I need to match tracks from a to-fix list with their correct entries in a catalogue for the same artist or similar artists.

Tracks that need fixing (${batch.length} tracks):
${batch.map((row, index) => `
${index + 1}. 
- Song Name: "${row['song name'] || ''}"
- Artist: "${row.artist || ''}"
- Label: "${row['Watary Label'] || ''}"
`).join('')}

Potential matches from catalogue (${limitedCatalogueRows.length} tracks):
${limitedCatalogueRows.map((row, index) => `
${index + 1}. 
- Track Name: "${row['Track Name'] || ''}"
- Artists: "${row.Artists || ''}"
- Label: "${row['Label Name'] || ''}"
- ISRC: "${row.ISRC || ''}"
`).join('')}

IMPORTANT RULES:
1. For each to-fix track, find the matching track in the catalogue
2. Consider common variations in track names:
   - Capitalization differences
   - Spacing differences
   - Special characters vs. regular characters
   - Minor spelling variations
   - Abbreviated words vs. full words
   - With/without featured artist in the title
3. Do not match completely different tracks
4. If you're unsure about a match, prefer not to match rather than making an incorrect match

Return your answer in this JSON format:
{
  "matches": [
    {
      "toFixTrack": {
        "songName": "song name from to-fix list",
        "artist": "artist from to-fix list",
        "label": "label from to-fix list"
      },
      "matched": true or false,
      "catalogueTrack": {
        "trackName": "track name from catalogue",
        "artist": "artist from catalogue",
        "label": "label from catalogue",
        "isrc": "ISRC code from catalogue"
      } or null if no match,
      "confidence": a number between 0 and 1 representing your confidence in the match,
      "reasoning": "A brief explanation of why you chose this match or why no match was found"
    },
    ...repeat for each to-fix track
  ]
}
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'system',
            content: 'You are a music metadata expert who specializes in matching tracks across different databases. You understand common variations in how track names are written, but you should never match completely different tracks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || '{"matches":[]}';
      const result = JSON.parse(content);
      
      // Add the results to our collection
      if (result.matches && Array.isArray(result.matches)) {
        allResults.push(...result.matches);
      }
    }
    
    return NextResponse.json({
      matches: allResults
    });
  } catch (error) {
    console.error('Error using AI for artist matching:', error);
    return NextResponse.json(
      { 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        matches: []
      }, 
      { status: 500 }
    );
  }
}
