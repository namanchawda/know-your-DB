// src/llm/groq.provider.ts

import fetch from 'node-fetch';
import {
  LLMProvider,
  GenerateSQLInput,
  GenerateSQLOutput,
} from './llm.types';
import { buildNLtoSQLPrompt } from '../nl/prompt.builder';

export class GroqProvider implements LLMProvider {
  private readonly url =
    'https://api.groq.com/openai/v1/chat/completions';

  async generateSQL(
    input: GenerateSQLInput,
  ): Promise<GenerateSQLOutput> {
    const apiKey = process.env.GROQ_API_KEY;

    console.log('GROQ_API_KEY loaded:', !!apiKey);

    if (!apiKey) {
      throw new Error('GROQ_API_KEY not set');
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
      },
      body: JSON.stringify({
        model: 'gemma2-9b-it',
        temperature: 0,
        max_tokens: 256,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert SQL generator. Output SQL only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error: ${errText}`);
    }

    const data: any = await res.json();

    const text =
      data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('Groq returned empty response');
    }

    return {
      sql: text,
      raw: JSON.stringify(data),
      provider: 'groq',
    };
  }
}
