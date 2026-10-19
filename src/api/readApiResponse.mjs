export async function readApiResponse(response, fallbackMessage) {
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (response.ok) {
    if (typeof body === 'string') {
      throw new Error('The server returned an invalid response.');
    }
    return body;
  }

  const details = Array.isArray(body?.errors)
    ? body.errors.map((item) => (typeof item === 'string' ? item : item?.message))
      .filter((item) => typeof item === 'string' && item.trim())
      .join(' ')
    : '';
  const plainTextMessage = typeof body === 'string'
    && response.status < 500
    && body.trim().length > 0
    && body.trim().length <= 200
    && !/<[^>]*>/.test(body)
    ? body.trim()
    : '';
  const message = typeof body === 'string' ? '' : [
    body?.error,
    body?.message,
    details,
  ].find((item) => typeof item === 'string' && item.trim());
  const error = new Error(message || plainTextMessage || `${fallbackMessage} (HTTP ${response.status})`);
  error.status = response.status;
  error.body = body;
  throw error;
}
