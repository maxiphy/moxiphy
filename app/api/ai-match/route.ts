import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyToken } from '../auth/route';

// Initialize OpenAI client for server-side use only
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const pin = process.env.NEXT_PUBLIC_ACCESS_PIN;
    
    // Extract token from Bearer format if present
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    console.log('AI-Match Auth Debug:', { 
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
    const { toFixRow, potentialMatches, maxMatches = 5 } = body;

    if (!toFixRow || !potentialMatches) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Limit the number of potential matches to avoid token limits
    const limitedMatches = potentialMatches.slice(0, maxMatches);
    
    // If there are no potential matches, return immediately
    if (limitedMatches.length === 0) {
      return NextResponse.json({
        bestMatch: null,
        confidence: 0,
        reasoning: 'No potential matches provided'
      });
    }
    
    const prompt = `
I need to match a music track that needs its ISRC code fixed with the correct entry from a catalogue.

Track that needs fixing:
- Song Name: "${toFixRow['song name'] || ''}"
- Artist: "${toFixRow['artist'] || ''}"
- Label: "${toFixRow['Watary Label'] || ''}"

Potential matches from catalogue (${limitedMatches.length} candidates):
${limitedMatches.map((match, index) => `
${index + 1}. 
- Track Name: "${match['Track Name'] || ''}"
- Artists: "${match['Artists'] || ''}"
- Label: "${match['Label Name'] || ''}"
- ISRC: "${match['ISRC'] || ''}"
`).join('')}

IMPORTANT RULES:
1. BOTH track name AND artist must match (with possible variations)
2. Consider common variations in track names and artist names:
   - Capitalization differences
   - Spacing differences
   - Special characters vs. regular characters
   - Minor spelling variations
   - Abbreviated words vs. full words
   - With/without featured artist in the title
3. DO NOT match tracks with the same name but by completely different artists
4. If you're unsure, prefer not to match rather than making an incorrect match

Return your answer in this JSON format:
{
  "matchIndex": null or the index (1-${limitedMatches.length}) of the best matching entry,
  "confidence": a number between 0 and 1 representing your confidence in the match,
  "reasoning": "A brief explanation of why you chose this match or why no match was found"
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        {
          role: 'system',
          content: 'You are a music metadata expert who specializes in matching tracks across different databases. You understand common variations in how track names and artist names are written, but you should never match tracks with the same name but by completely different artists.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    
    // Extract the best match if one was found
    let bestMatch = null;
    if (result.matchIndex !== null && result.matchIndex > 0 && result.matchIndex <= limitedMatches.length) {
      bestMatch = limitedMatches[result.matchIndex - 1];
    }
    
    return NextResponse.json({
      bestMatch,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || 'No reasoning provided'
    });
  } catch (error) {
    console.error('Error using AI for matching:', error);
    return NextResponse.json(
      { 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        bestMatch: null,
        confidence: 0,
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, 
      { status: 500 }
    );
  }
}
