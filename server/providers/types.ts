export interface ProviderResult {
  model: string;
  text: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}
