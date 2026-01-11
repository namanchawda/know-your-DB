import { Injectable } from '@nestjs/common';
import { GenerateSQLInput } from './llm.types';
import { LLMProviderFactory } from './llm.factory';

@Injectable()
export class LLMService {
  async generateSQL(input: GenerateSQLInput) {
    const mode = input.mode ?? 'auto';
    const provider = LLMProviderFactory.getProvider(mode);

    // Explicit local or cloud mode
    if (mode !== 'auto') {
      return provider.generateSQL(input);
    }

    // AUTO MODE: cloud → local fallback
    try {
      return await provider.generateSQL(input);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';

      console.warn(
        'Cloud LLM failed, falling back to local:',
        message,
      );

      const fallback = LLMProviderFactory.getFallback();

      // Safety: avoid accidental recursion
      if (fallback === provider) {
        throw err;
      }

      return fallback.generateSQL(input);
    }
  }
}
