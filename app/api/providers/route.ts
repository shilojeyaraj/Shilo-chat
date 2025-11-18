import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';

/**
 * API endpoint to get available providers
 * Used by the UI to show only available models
 */
export async function GET(req: NextRequest) {
  try {
    const available = Object.entries(providers)
      .filter(([_, provider]) => provider.isAvailable())
      .map(([key, provider]) => ({
        key,
        name: provider.name,
        available: true,
      }));

    return NextResponse.json({
      providers: available,
      allAvailable: available.length > 0,
    });
  } catch (error) {
    console.error('Providers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

