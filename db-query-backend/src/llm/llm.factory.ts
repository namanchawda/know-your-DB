// src/llm/llm.factory.ts

import { LLMMode, LLMProvider } from './llm.types';
import { OllamaProvider } from './ollama.provider';
import { GroqProvider } from './grok.provider';
import { OpenRouterProvider } from './openrouter.provider';

export class LLMProviderFactory {
  static getProvider(mode: LLMMode = 'auto'): LLMProvider {
    switch (mode) {
      case 'local':
        return new OllamaProvider();
      case 'cloud':
        return new OpenRouterProvider();
      case 'auto':
      default:
        return new GroqProvider(); // primary
    }
  }

  static getFallback(): LLMProvider {
    return new OllamaProvider();
  }
}
