import { NextRequest, NextResponse } from 'next/server';

/**
 * Save personal information from chat
 * Called by the save_personal_info tool during chat
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Validate each item
    const validCategories = ['experience', 'project', 'education', 'skill', 'resume', 'general', 'achievement', 'contact'];
    const validatedItems = items.map((item: any, index: number) => {
      if (!item.title || !item.content || !item.category) {
        throw new Error(`Item ${index + 1} missing required fields (title, content, category)`);
      }
      if (!validCategories.includes(item.category)) {
        throw new Error(`Item ${index + 1} has invalid category "${item.category}". Valid: ${validCategories.join(', ')}`);
      }
      return {
        category: item.category,
        title: item.title,
        content: item.content,
        tags: item.tags || [],
        metadata: item.metadata || {},
      };
    });

    // Return validated items for the client to save to IndexedDB
    // (IndexedDB is client-side only, so the actual DB write happens in the frontend)
    return NextResponse.json({
      success: true,
      items: validatedItems,
      message: `${validatedItems.length} item(s) ready to save to personal profile`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process personal info' },
      { status: 400 }
    );
  }
}
