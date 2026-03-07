import { classifyTask } from './router';

describe('classifyTask', () => {
  it('returns vision when hasImages is true', async () => {
    expect(await classifyTask('describe this', true)).toBe('vision');
  });

  it('returns code_generation for code-related prompts', async () => {
    expect(await classifyTask('write code for a function')).toBe('code_generation');
    expect(await classifyTask('create a React component')).toBe('code_generation');
  });

  it('returns code_editing when hasCode and fix/debug keywords', async () => {
    expect(await classifyTask('fix this bug', false, true)).toBe('code_editing');
    expect(await classifyTask('refactor this code', false, true)).toBe('code_editing');
  });

  it('returns web_search for search-like queries', async () => {
    expect(await classifyTask('search for latest news')).toBe('web_search');
    expect(await classifyTask('what is the weather today')).toBe('web_search');
  });

  it('returns deep_research for comprehensive research keywords', async () => {
    expect(await classifyTask('I need a comprehensive report on AI')).toBe('deep_research');
    expect(await classifyTask('deep dive into machine learning')).toBe('deep_research');
  });

  it('returns creative_writing for story/poem prompts', async () => {
    expect(await classifyTask('write a short story')).toBe('creative_writing');
    expect(await classifyTask('write a poem about the ocean')).toBe('creative_writing');
  });

  it('returns data_analysis for analyze/data keywords', async () => {
    expect(await classifyTask('analyze this dataset')).toBe('data_analysis');
    expect(await classifyTask('show me statistics for this csv')).toBe('data_analysis');
  });

  it('returns study for study plan pattern (learning + plan + time, no "study" word)', async () => {
    // Must match study plan regex but not contain "study" (which triggers deep_research first)
    const msg = "I'm learning French. Give me a plan for 2 hours";
    expect(await classifyTask(msg)).toBe('study');
  });

  it('returns quick_qa for short factual questions', async () => {
    expect(await classifyTask('what is TypeScript?')).toBe('quick_qa');
    expect(await classifyTask('who is the president?')).toBe('quick_qa');
  });

  it('returns reasoning for why/how questions', async () => {
    expect(await classifyTask('why does this happen?')).toBe('reasoning');
    expect(await classifyTask('explain why the sky is blue')).toBe('reasoning');
  });

  it('returns general for generic messages', async () => {
    expect(await classifyTask('Hello, how are you?')).toBe('general');
  });

  it('returns long_context for many files or very long message', async () => {
    expect(await classifyTask('Summarize this', false, false, 5)).toBe('long_context');
    expect(await classifyTask('A'.repeat(20000), false, false, 0)).toBe('long_context');
  });
});
