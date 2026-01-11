// src/llm/llm.types.ts

export type LLMMode = 'local' | 'cloud' | 'auto';

export interface GenerateSQLInput {
  dbType: string;
  schema: {
    name: string;
    columns: string[];
  }[];
  question: string;
  mode?: LLMMode;
}

export interface GenerateSQLOutput {
  sql: string;
  raw?: string;
  provider: 'ollama' | 'groq' | 'openrouter';
}

export interface LLMProvider {
  generateSQL(input: GenerateSQLInput): Promise<GenerateSQLOutput>;
}
