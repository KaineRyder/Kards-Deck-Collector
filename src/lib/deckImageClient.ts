export async function requestDeckImage(code: string): Promise<string> {
  if (window.kardsDesktop?.generateDeckImage) {
    return window.kardsDesktop.generateDeckImage(code);
  }

  const response = await fetch('/api/deck-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    let errorMessage = 'Failed to get deck image.';
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } else {
      const text = await response.text();
      console.error('Server returned non-JSON response:', text.substring(0, 200));
      errorMessage = `Deck image request failed (${response.status}).`;
    }
    throw new Error(errorMessage);
  }

  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Deck image server returned an invalid response format.');
  }

  const data = await response.json() as { imageData?: string };
  if (!data.imageData) {
    throw new Error('Deck image server did not return image data.');
  }

  return data.imageData;
}
