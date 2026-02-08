// Extension configuration
// Update these values for your deployment

// Your hosted API URL (Cloudflare tunnel or production URL)
const API_BASE = 'https://api.crowd.cab';

// Supabase project settings (same as your frontend)
const SUPABASE_URL = 'https://yypvpoqstsfrfgenjmyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cHZwb3FzdHNmcmZnZW5qbXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTc5MDQsImV4cCI6MjA4NjA3MzkwNH0.RHZxIw5uMysKnVRepkzWG7kNRxPKj7k__B9t4D757Q0';

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.CONFIG = { API_BASE, SUPABASE_URL, SUPABASE_ANON_KEY };
}
