export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface Issue {
  id: string;
  description?: string;
  latitude: number;
  longitude: number;
  state: IssueState;
  priority?: number;
  category?: string;
  confidence?: number;
  image_urls: string[];
  annotated_urls: string[];
  validation_source?: string;
  is_duplicate: boolean;
  parent_issue_id?: string;
  geo_status?: string;
  created_at: string;
  updated_at: string;
}

export type IssueState = 'reported' | 'validated' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'rejected' | 'pending_confirmation';

export interface CreateIssuePayload {
  images: File[];
  description?: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  platform: string;
  device_model?: string;
}

export interface IssueListResponse {
  items: Issue[];
  total: number;
  page: number;
  page_size: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  altitude?: number;
}

export interface FlowStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  decision?: string;
  reasoning?: string;
  timestamp?: string;
}
