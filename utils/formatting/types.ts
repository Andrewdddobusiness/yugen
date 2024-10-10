/**
 * Formats a string by replacing underscores with spaces and capitalizing each word.
 *
 * @param input - The input string to format (e.g., "tourist_attraction")
 * @returns The formatted string (e.g., "Tourist Attraction")
 */
export function formatCategoryType(input: string): string {
  const words = input.split("_");

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Formats an array of strings by replacing underscores with spaces and capitalizing each word.
 *
 * @param inputs - An array of input strings to format
 * @returns An array of formatted strings
 */
export function formatCategoryTypeArray(inputs: string[]) {
  return inputs.map(formatCategoryType);
}
