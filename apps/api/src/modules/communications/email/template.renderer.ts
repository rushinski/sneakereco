import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads an HTML template from disk and replaces {{token}} placeholders.
 * Templates live alongside this file at email/templates/*.html and are
 * copied to dist by nest-cli.json's assets config.
 */
export function renderTemplate(templateName: string, data: Record<string, string>): string {
  const templatePath = join(__dirname, 'templates', `${templateName}.html`);
  const raw = readFileSync(templatePath, 'utf-8');
  return raw.replace(/\{\{(\w+)\}\}/g, (_, key: string) => data[key] ?? '');
}
