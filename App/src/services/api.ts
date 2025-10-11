/**
 * API Client for StudentNest Mobile App
 * Handles all API requests to the backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  RoomShare, 
  CreateRoomShareData, 
  RoomSharingFilters, 
  Application 
} from '@/types/roomSharing';

import { config } from '@/src/config';

const API_BASE_URL = config.apiBaseUrl;
const MAX_LOGIN_ATTEMPTS = config.auth.maxLoginAttempts;
const LOCK_TIME_HOURS = config.auth.lockTimeHours;

interface APIResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from storage
   */
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Generic request method with token refresh logic
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const token = await this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      console.log(`Making request to ${this.baseURL}${endpoint}`, {
        method: options.method || 'GET',
        headers,
      });

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      let data;
      try {
        // Log full request details for debugging
        console.log('Full request details:', {
          url: `${this.baseURL}${endpoint}`,
          method: options.method,
          headers,
          body: options.body
        });

        const text = await response.text();
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        console.log('Raw response text:', text);
        
        if (!text) {
          throw new Error('Empty response from server');
        }

        try {
          data = JSON.parse(text);
          console.log('Parsed response data:', data);
        } catch (e) {
          console.error('Failed to parse response as JSON:', text);
          throw new Error(`Invalid JSON response: ${text}`);
        }
      } catch (error) {
        console.error('Error processing response:', error);
        throw error instanceof Error ? error : new Error('Unknown error occurred');
      }

      console.log(`Response from ${endpoint}:`, {
        status: response.status,
        data,
      });

      // Handle 401 - Token expired, try to refresh
      if (response.status === 401 && endpoint !== '/auth/refresh') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          return this.request(endpoint, options);
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error('API Request Error:', error);
      return {
        success: false,
        data: null as any,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await this.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.success && response.data.accessToken) {
        await AsyncStorage.setItem('authToken', response.data.accessToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // ============================================
  // ROOM SHARING METHODS
  // ============================================

  /**
   * Get all room sharing listings with filters
   */
  async getRoomShares(filters?: RoomSharingFilters): Promise<{
    shares: RoomShare[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.gender) queryParams.append('gender', filters.gender);
    if (filters?.maxBudget) queryParams.append('maxBudget', filters.maxBudget.toString());
    if (filters?.city) queryParams.append('city', filters.city);
    if (filters?.status) queryParams.append('status', filters.status);

    const query = queryParams.toString();
    const endpoint = query ? `/room-sharing?${query}` : '/room-sharing';

    const response = await this.request<{
      shares: RoomShare[];
      requests: RoomShare[];
      total: number;
      page: number;
      totalPages: number;
    }>(endpoint);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch room shares');
    }

    return {
      shares: response.data.shares || response.data.requests || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      totalPages: response.data.totalPages || 1,
    };
  }

  /**
   * Get single room share details
   */
  async getRoomShareById(id: string): Promise<RoomShare> {
    const response = await this.request<RoomShare>(`/room-sharing/${id}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch room share details');
    }

    return response.data;
  }

  /**
   * Create new room sharing request
   */
  async createRoomShare(propertyId: string, data: Partial<CreateRoomShareData>): Promise<{
    id: string;
    message: string;
  }> {
    // Calculate required fields
    const maxParticipants = data.maxParticipants || 2;
    const rentPerPerson = data.costSharing?.rentPerPerson || 0;
    const totalRent = rentPerPerson * maxParticipants;
    const securityDeposit = data.costSharing?.securityDeposit || totalRent;

    // Map habits to studyHabits
    let studyHabitsValue: 'Focused' | 'Balanced' | 'Serious' | 'Flexible' = 'Balanced';
    const lifestyle = data.requirements?.lifestyle || [];
    if (lifestyle.includes('Studious')) studyHabitsValue = 'Focused';
    else if (lifestyle.includes('Working Professional')) studyHabitsValue = 'Serious';
    else if (lifestyle.includes('Freelancer')) studyHabitsValue = 'Flexible';

    const payload = {
      propertyId,
      maxParticipants,
      requirements: {
        gender: data.requirements?.gender || 'any',
        ageRange: data.requirements?.ageRange || { min: 18, max: 35 },
        preferences: data.requirements?.preferences || [],
        lifestyle: data.requirements?.lifestyle || [],
        studyHabits: studyHabitsValue,
      },
      costSharing: {
        monthlyRent: totalRent,
        rentPerPerson: rentPerPerson,
        securityDeposit: securityDeposit,
        depositPerPerson: Math.ceil(securityDeposit / maxParticipants),
        maintenanceCharges: data.costSharing?.maintenanceCharges || 0,
        maintenancePerPerson: data.costSharing?.maintenanceCharges 
          ? Math.ceil(data.costSharing.maintenanceCharges / maxParticipants) 
          : 0,
        utilitiesIncluded: data.costSharing?.utilitiesIncluded || false,
        utilitiesPerPerson: data.costSharing?.utilitiesPerPerson || 0,
      },
      description: data.description || '',
      roomConfiguration: {
        totalBeds: maxParticipants,
        bedsAvailable: maxParticipants - 1,
        hasPrivateBathroom: data.roomConfiguration?.hasPrivateBathroom || false,
        hasSharedKitchen: data.roomConfiguration?.hasSharedKitchen || true,
        hasStudyArea: data.roomConfiguration?.hasStudyArea || false,
        hasStorage: data.roomConfiguration?.hasStorage || false,
      },
      availableFrom: data.availableFrom || new Date().toISOString(),
      duration: data.duration || '6 months',
      houseRules: data.houseRules || [],
      contact: data.contact || {
        phone: '',
        whatsappAvailable: true,
        preferredContactTime: 'evening',
      },
    };

    const response = await this.request<{ id: string; message: string }>(
      '/room-sharing',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to create room share');
    }

    return response.data;
  }

  /**
   * Apply to join a room share
   */
  async applyToRoomShare(shareId: string, message: string, moveInDate: string): Promise<void> {
    const response = await this.request(`/room-sharing/${shareId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ message, moveInDate }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to submit application');
    }
  }

  /**
   * Get my room sharing applications
   */
  async getMyRoomSharingApplications(): Promise<Application[]> {
    const response = await this.request<{ applications: Application[] }>(
      '/room-sharing/applications'
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch applications');
    }

    return response.data.applications || [];
  }

  /**
   * Respond to a room sharing application (accept/reject)
   */
  async respondToApplication(
    applicationId: string, 
    action: 'accept' | 'reject', 
    message?: string
  ): Promise<void> {
    const response = await this.request(`/room-sharing/applications/${applicationId}`, {
      method: 'PUT',
      body: JSON.stringify({ action, message }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to respond to application');
    }
  }

  /**
   * Get my room shares (posted by me)
   */
  async getMyRoomShares(status?: 'active' | 'full' | 'closed'): Promise<RoomShare[]> {
    const query = status ? `?status=${status}` : '';
    const response = await this.request<{ shares: RoomShare[] }>(
      `/room-sharing/my-shares${query}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch your room shares');
    }

    return response.data.shares || [];
  }

  /**
   * Deactivate a room share
   */
  async deactivateRoomShare(shareId: string): Promise<void> {
    const response = await this.request(`/room-sharing/${shareId}/deactivate`, {
      method: 'PUT',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to deactivate room share');
    }
  }

  /**
   * Get room sharing statistics
   */
  async getRoomSharingStats(): Promise<{
    totalShares: number;
    activeShares: number;
    myApplications: number;
    matchedApplications: number;
  }> {
    const response = await this.request<{
      totalShares: number;
      activeShares: number;
      myApplications: number;
      matchedApplications: number;
    }>('/room-sharing/statistics');

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch statistics');
    }

    return response.data;
  }

  // ============================================
  // PROPERTY/ROOM METHODS (Placeholder)
  // ============================================

  /**
   * Get room details by ID
   */
  async getRoomById(roomId: string): Promise<any> {
    const response = await this.request(`/rooms/${roomId}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch room details');
    }

    return response.data;
  }
}

// Create and export singleton instance
export const api = new APIClient(API_BASE_URL);

// Export the class for testing
export default APIClient;
