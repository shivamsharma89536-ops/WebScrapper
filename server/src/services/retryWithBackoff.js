function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function retryWithBackoff(operation, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    shouldRetry,
    delay = wait,
  } = options;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const hasAnotherAttempt = attempt < maxAttempts;
      if (!hasAnotherAttempt || !shouldRetry || !shouldRetry(error)) {
        throw error;
      }

      await delay(baseDelayMs * (2 ** (attempt - 1)));
    }
  }
}

module.exports = retryWithBackoff;
