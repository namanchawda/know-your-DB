// import fetch from 'node-fetch';
import {
  LLMProvider,
  GenerateSQLInput,
  GenerateSQLOutput,
} from './llm.types';
import { buildNLtoSQLPrompt } from '../nl/prompt.builder';

export class OpenRouterProvider implements LLMProvider {
  private readonly url = 'https://openrouter.ai/api/v1/chat/completions';

  async generateSQL(
    input: GenerateSQLInput,
  ): Promise<GenerateSQLOutput> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model =
      process.env.OPENROUTER_MODEL ??
      'meta-llama/llama-3.1-8b-instruct';

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not set');
    }

    const prompt = buildNLtoSQLPrompt(
      input.dbType,
      input.schema,
      input.question,
    );

    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'DB-Chatbot',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You generate SQL queries only. No explanations.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter error: ${await res.text()}`);
    }

    const data: any = await res.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('OpenRouter returned empty response');
    }

    return {
      sql: text,
      raw: JSON.stringify(data),
      provider: 'openrouter',
    };
  }
}
