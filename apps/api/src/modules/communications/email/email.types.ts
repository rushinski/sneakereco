export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}
