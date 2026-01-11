export interface LLMProvider {
  generateSQL(prompt: string): Promise<string>;
}
