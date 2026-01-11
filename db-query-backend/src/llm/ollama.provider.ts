// src/llm/ollama.provider.ts

// import fetch from 'node-fetch';
import {
  LLMProvider,
  GenerateSQLInput,
  GenerateSQLOutput,
} from './llm.types';
import { buildNLtoSQLPrompt } from '../nl/prompt.builder';

export class OllamaProvider implements LLMProvider {
  private readonly baseUrl = 'http://localhost:11434';

  async generateSQL(input: GenerateSQLInput): Promise<GenerateSQLOutput> {
    const prompt = buildNLtoSQLPrompt(
      input.dbType,
      input.schema,
      input.question,
    );

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt,
        stream: false,
        options: {
          num_predict: 48,
          temperature: 0,
          top_p: 0.9,
          repeat_penalty: 1.1,
        },
      }),
    });

    const data: any = await res.json();
    const text = data?.response?.trim();

    if (!text) {
      throw new Error('Ollama returned empty response');
    }

    return {
      sql: text,
      raw: JSON.stringify(data),
      provider: 'ollama',
    };
  }
}
