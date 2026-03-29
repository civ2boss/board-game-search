export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Helper function to ensure BGG image URLs are complete
export function proxyImageUrl(url: string): string {
  if (!url) return '';
  // If it's already a full URL, return as-is
  if (url.startsWith('http')) return url;
  // If it's a path, prepend the BGG domain
  if (url.startsWith('/')) return `https://cf.geekdo-images.com${url}`;
  return url;
}
