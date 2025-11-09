export function getFilenameFromResponse(response: Response): string | null {
  const disposition = response.headers.get('content-disposition');
  if (!disposition) return null;

  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  return match ? match[1].replace(/['"]/g, '') : null;
}
