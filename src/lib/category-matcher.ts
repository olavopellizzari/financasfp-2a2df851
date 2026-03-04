import { Category } from '@/lib/db';

export function matchCategory(description: string, categories: Category[]): string | undefined {
  if (!description || !categories) {
    return undefined;
  }

  const lowerCaseDescription = description.toLowerCase();

  for (const category of categories) {
    if (!category.keywords) continue;
    const keywords = category.keywords.toLowerCase().split(',').map(k => k.trim());
    if (keywords.some(keyword => lowerCaseDescription.includes(keyword))) {
      return category.id;
    }
  }

  return undefined;
}