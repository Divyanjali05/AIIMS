import { RadarSignal } from '../types';
import { ArXivHuggingFaceIngestionAdapter } from './signalIngestionAdapter';

/**
 * SignalDataProvider — Clean Isolation Boundary for AI Radar Signals.
 *
 * Pipeline Architecture:
 * External Source -> Signal Ingestion -> Normalization -> AI Summarization / Classification -> Learner Relevance Filtering -> Radar UI
 */

export class SignalDataProvider {
  private static ingestionAdapter = new ArXivHuggingFaceIngestionAdapter();
  private static cachedSignals: RadarSignal[] | null = null;

  /**
   * Fetch all active radar signals through the ingestion adapter pipeline.
   */
  public static async getSignals(): Promise<RadarSignal[]> {
    if (SignalDataProvider.cachedSignals && SignalDataProvider.cachedSignals.length > 0) {
      return SignalDataProvider.cachedSignals;
    }
    const signals = await SignalDataProvider.ingestionAdapter.fetchLatestSignals();
    SignalDataProvider.cachedSignals = signals;
    return signals;
  }

  /**
   * Fetch a single signal by ID.
   */
  public static async getSignalById(signalId: string): Promise<RadarSignal | null> {
    const signals = await SignalDataProvider.getSignals();
    return signals.find((s) => s.id === signalId) || null;
  }

  /**
   * Filter signals relevant to a specific learner focus track.
   */
  public static async getSignalsByFocus(focusTrack: string): Promise<RadarSignal[]> {
    const all = await SignalDataProvider.getSignals();
    if (!focusTrack) return all;

    const lowerFocus = focusTrack.toLowerCase();
    return all.filter(
      (s) =>
        s.title.toLowerCase().includes(lowerFocus) ||
        s.category.toLowerCase().includes(lowerFocus) ||
        s.summary.toLowerCase().includes(lowerFocus) ||
        (s.relevanceContext && s.relevanceContext.toLowerCase().includes(lowerFocus))
    );
  }

  /**
   * Toggle follow state on a signal.
   */
  public static async toggleFollowSignal(signalId: string): Promise<boolean> {
    const signals = await SignalDataProvider.getSignals();
    const signal = signals.find((s) => s.id === signalId);
    if (signal) {
      signal.isFollowed = !signal.isFollowed;
      return signal.isFollowed;
    }
    return false;
  }
}
