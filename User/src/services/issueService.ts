import { API_BASE_URL } from '../config/supabase';
import { Issue, IssueListResponse, LocationData } from '../types';
import EventSource, { EventSourceListener } from "react-native-sse";
import { cacheService } from './cacheService';

class IssueService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async createIssue(
    imageUri: string,
    location: LocationData,
    description?: string,
    accessToken?: string
  ): Promise<{ issue_id: string; stream_url: string }> {
    const formData = new FormData();
    
    const imageFile = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'issue_photo.jpg',
    } as any;
    
    formData.append('images', imageFile);
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());
    formData.append('accuracy_meters', location.accuracy.toString());
    formData.append('platform', 'mobile_app');
    formData.append('device_model', 'expo_device');
    
    if (description) {
      formData.append('description', description);
    }
    
    if (accessToken) {
      formData.append('authorization', `Bearer ${accessToken}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };

    const response = await fetch(`${this.baseUrl}/issues/stream`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create issue');
    }

    await cacheService.clearCache();

    return response.json();
  }


  async getIssue(issueId: string): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/issues/${issueId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch issue');
    }

    return response.json();
  }

  async listIssues(
    page: number = 1,
    pageSize: number = 20,
    state?: string,
    userId?: string
  ): Promise<IssueListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (state) {
      params.append('state', state);
    }
    
    if (userId) {
      params.append('user_id', userId);
    }

    const response = await fetch(`${this.baseUrl}/issues?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch issues');
    }

    return response.json();
  }


  async connectToFlowStream(
    issueId: string,
    onMessage: (data: any) => void,
    onError: (error: Error) => void
  ): Promise<() => void> {
    const eventSource = new EventSource(`${this.baseUrl}/flow/flow/${issueId}`);

    const listener: EventSourceListener = (event) => {
        if (event.type === 'message') {
             try {
                const data = JSON.parse(event.data || '{}');
                onMessage(data);
              } catch (e) {
                console.error('Failed to parse SSE message:', e);
              }
        } else if (event.type === 'error') {
             onError(new Error('SSE connection error'));
        }
    };

    eventSource.addEventListener('message', listener);
    eventSource.addEventListener('error', listener);

    return () => {
      eventSource.removeAllEventListeners();
      eventSource.close();
    };
  }
  async confirmIssue(issueId: string, confirmed: boolean): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/issues/${issueId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmed }),
    });

    if (!response.ok) {
      throw new Error('Failed to confirm issue');
    }

    return response.json();
  }
}

export const issueService = new IssueService();
