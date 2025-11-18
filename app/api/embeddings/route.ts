import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for generating embeddings
 * This keeps the OpenAI API key secure on the server
 */
export async function POST(req: NextRequest) {
  try {
    const { texts } = await req.json();

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: texts must be a non-empty array' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${response.statusText}`, details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const embeddings = data.data.map((item: any) => item.embedding);

    return NextResponse.json({ embeddings });
  } catch (error) {
    console.error('Embeddings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

