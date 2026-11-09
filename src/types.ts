export interface Learning {
  id: string;
  text: string;
  title: string;
  category: string;
  createdAt: string;
  drafts?: GeneratedPost[];
}

export interface GeneratedPost {
  styleLabel: string;
  title: string;
  text: string;
  explanation: string;
}

export interface PostAnalysis {
  hookScore: number;
  hookFeedback: string;
  readabilityScore: number;
  readabilityFeedback: string;
  valueScore: number;
  valueFeedback: string;
  estimatedEngagement: string; // 'Low' | 'Medium' | 'High'
  estimatedEngagementRationale: string;
  wordCount: number;
  readTimeSeconds: number;
  suggestions: string[];
}

export interface ToneOption {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface IndustryOption {
  id: string;
  label: string;
}

export interface AudienceOption {
  id: string;
  label: string;
}

export interface SavedDraft {
  id: string;
  learningId: string;
  learningTitle: string;
  text: string;
  styleLabel: string;
  tone: string;
  length: string;
  createdAt: string;
  isFavorite: boolean;
  notes?: string;
}
