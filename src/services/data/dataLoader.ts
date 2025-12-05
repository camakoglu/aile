import { FamilyData } from '../../types/types';
import { databaseService } from '../database/databaseService';
import { isDatabaseAvailable } from '../database/supabaseClient';
import { loadFromGoogleSheet } from './sheetLoader';

/**
 * Unified data loader that tries Supabase first, then falls back to Google Sheets
 */
export async function loadFamilyData(googleSheetUrl?: string): Promise<FamilyData | null> {
  // Try Supabase first
  try {
    const isDbAvailable = await isDatabaseAvailable();
    if (isDbAvailable) {
      console.log('Loading family data from Supabase database...');
      const data = await databaseService.fetchFamilyData();
      if (data) {
        console.log('Successfully loaded data from Supabase');
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load from Supabase, falling back to Google Sheets:', error);
  }

  // Fall back to Google Sheets
  if (googleSheetUrl) {
    console.log('Loading family data from Google Sheets...');
    const data = await loadFromGoogleSheet(googleSheetUrl);
    if (data) {
      console.log('Successfully loaded data from Google Sheets');
      return data;
    }
  }

  console.error('Failed to load family data from any source');
  return null;
}

/**
 * Determine which data source is being used
 */
export async function getDataSource(): Promise<'supabase' | 'google-sheets' | 'none'> {
  try {
    const isDbAvailable = await isDatabaseAvailable();
    if (isDbAvailable) {
      return 'supabase';
    }
  } catch {
    // Database not available
  }

  // Check if Google Sheets URL is configured
  const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_CSV_URL;
  if (googleSheetUrl) {
    return 'google-sheets';
  }

  return 'none';
}
