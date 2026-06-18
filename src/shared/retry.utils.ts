export async function retry<T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs: number
): Promise<T> {

  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    }
    catch (error) {
      lastError = error;

      if (attempt < retries) {
        await new Promise(resolve =>
          setTimeout(resolve, delayMs)
        );
      }
    }
  }

  throw lastError;
}
