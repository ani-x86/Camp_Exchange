export async function readApiResponse(response, fallbackMessage) {
  const body = await response.text();
  let data;

  if (body.trim()) {
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
    }
  } else {
    throw new Error(`Server returned an empty response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    if (typeof data.error === 'string' && data.error) {
      throw new Error(data.error);
    }
    throw new Error(
      `${fallbackMessage} (HTTP ${response.status}).`
    );
  }

  return data;
}
