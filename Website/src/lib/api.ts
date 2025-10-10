// Complete API utility for StudentNest Frontend-Backend Integration
import type { ApiResponse, User } from '@/types';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com'
  : 'http://localhost:3000';

class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken') || localStorage.getItem('token');
    }
    return null;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('isLoggedIn');
    }
  }

  async request<T = any>(endpoint: string, options: RequestInit & { isFormData?: boolean } = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/api${endpoint}`;
    const token = this.getToken();

    const defaultHeaders: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    // Only add Content-Type for non-FormData requests
    const isFormData = options.body instanceof FormData || options.isFormData;
    if (!isFormData) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    // Only stringify body if it's not FormData and is an object
    if (config.body && typeof config.body === 'object' && !isFormData) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 - Token expired, try to refresh
      if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
        console.log('Token expired, attempting to refresh...');

        try {
          const refreshResponse = await this.attemptTokenRefresh();
          if (refreshResponse.success) {
            // Retry original request with new token
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${refreshResponse.data?.accessToken}`,
            };
            const retryResponse = await fetch(url, config);
            return await retryResponse.json();
          }
        } catch (refreshError) {
          console.log('Token refresh failed:', refreshError);
          this.handleAuthFailure();
          throw new Error('Authentication failed');
        }
      }

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        // Handle other auth failures
        if (response.status === 401) {
          this.handleAuthFailure();
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', endpoint, error);
      throw error;
    }
  }

  async attemptTokenRefresh(): Promise<ApiResponse<{ accessToken: string; user: User }>> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse<{ accessToken: string; user: User }> = await response.json();

      if (response.ok && data.success && data.data) {
        // Update stored token
        this.setToken(data.data.accessToken);

        // Update user data if provided
        if (data.data.user && typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }

        console.log('Token refreshed successfully');
        return data;
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  handleAuthFailure() {
    console.log('Authentication failed, redirecting to login...');
    this.clearToken();

    if (typeof window !== 'undefined') {
      // Store current page for redirect after login
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/student/login' && currentPath !== '/owner/login' && currentPath !== '/student/signup' && currentPath !== '/owner/signup') {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }

      // Redirect to login
      window.location.href = '/student/login';
    }
  }

  clearAuthData() {
    this.clearToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  async initializeAuth(): Promise<User | null> {
    try {
      const token = this.getToken();

      if (!token) {
        this.clearAuthData();
        return null;
      }

      const response = await this.request<{ user: User }>('/auth/me');

      if (response.success && response.data?.user) {
        const user = response.data.user;

        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('isLoggedIn', 'true');
        }

        return user;
      }

      this.clearAuthData();
      return null;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.clearAuthData();
      return null;
    }
  }

  async login(identifier: string, password: string, role?: 'student' | 'owner', rememberMe = true) {
    try {
      const response = await this.request<{ user: User; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password, role }),
      });

      if (response.success && response.data) {
        this.setToken(response.data.accessToken);

        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('isLoggedIn', 'true');
        }

        return { success: true, user: response.data.user };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  async logoutUser() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await this.request('/auth/check');
      return response.success;
    } catch {
      return false;
    }
  }

  async getCurrentUser() {
    return this.request<{ user: User }>('/auth/me');
  }

  // Saved rooms methods
  async getSavedRooms() {
    return this.request('/saved-rooms');
  }

  async saveRoom(roomId: string) {
    return this.request('/saved-rooms', {
      method: 'POST',
      body: { roomId } as any,
    });
  }

  async unsaveRoom(roomId: string) {
    return this.request(`/saved-rooms?roomId=${roomId}`, {
      method: 'DELETE',
    });
  }

  async isRoomSaved(roomId: string) {
    const response = await this.getSavedRooms();
    if (response.success) {
      return response.data.savedRooms.some((room: any) => room.id === roomId);
    }
    return false;
  }

  // Property methods
  async getProperties() {
    return this.request('/properties');
  }

  async getMyProperties() {
    return this.request('/properties/my-properties');
  }

  async postProperty(propertyData: any) {
    return this.request('/properties/post', {
      method: 'POST',
      body: propertyData as any,
    });
  }

  // Room methods
  async getRoomById(id: string) {
    return this.request(`/rooms/${id}`);
  }

  async getRooms(filters?: {
    page?: number;
    limit?: number;
    city?: string;
    state?: string;
    pincode?: string;
    minPrice?: number;
    maxPrice?: number;
    roomType?: string; // 'single' | 'shared' | 'studio' or comma-separated
    accommodationType?: string; // 'pg' | 'hostel' | 'apartment' | 'room' or comma-separated
    amenities?: string; // comma-separated amenities
    minRating?: number;
    minArea?: number;
    maxArea?: number;
    availableFrom?: string; // ISO date string
    genderPreference?: string;
    furnished?: boolean;
    balcony?: boolean;
    attachedBathroom?: boolean;
    verifiedOwner?: boolean;
    search?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'rating_asc' | 'newest' | 'oldest' | 'area_asc' | 'area_desc' | 'popular' | 'availability';
    nearbyUniversity?: string;
    lat?: number;
    lng?: number;
    maxDistance?: number; // in kilometers
  }) {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    return this.request(`/rooms${queryString ? `?${queryString}` : ''}`);
  }

  async createRoom(roomData: {
    title: string;
    description: string;
    fullDescription?: string;
    price: number;
    images: string[]; // Cloudinary URLs
    roomType: 'single' | 'shared' | 'studio';
    accommodationType: 'pg' | 'hostel' | 'apartment' | 'room';
    maxSharingCapacity?: number;
    securityDeposit: number;
    maintenanceCharges?: number;
    location: {
      address: string;
      fullAddress: string;
      city: string;
      state: string;
      pincode: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
      nearbyUniversities?: Array<{
        name: string;
        distance: string;
        commute?: string;
      }>;
      nearbyFacilities?: Array<{
        name: string;
        distance: string;
        type: string;
      }>;
    };
    features?: {
      area?: number;
      floor?: number;
      totalFloors?: number;
      furnished?: boolean;
      balcony?: boolean;
      attached_bathroom?: boolean;
    };
    amenities?: string[];
    rules?: {
      genderPreference?: 'male' | 'female' | 'any';
      smokingAllowed?: boolean;
      petsAllowed?: boolean;
      drinkingAllowed?: boolean;
      visitorsAllowed?: boolean;
      couplesAllowed?: boolean;
    };
    availability?: {
      isAvailable?: boolean;
      availableRooms?: number;
      availableFrom?: Date | string;
    };
    totalRooms?: number;
    tags?: string[];
  }) {
    return this.request('/rooms', {
      method: 'POST',
      body: roomData as any,
    });
  }

  async updateRoom(id: string, roomData: any) {
    return this.request(`/rooms/${id}`, {
      method: 'PUT',
      body: roomData as any,
    });
  }

  async deleteRoom(id: string) {
    return this.request(`/rooms/${id}`, {
      method: 'DELETE',
    });
  }

  // Upload methods (Cloudinary)

  /**
   * Upload a single image to Cloudinary
   * @param file - Base64 encoded file or File object
   * @param options - Upload options
   */
  async uploadImage(
    file: string | File,
    options?: {
      category?: 'property' | 'profile' | 'document';
      propertyId?: string;
    }
  ) {
    let base64File: string;

    // Convert File to base64 if needed
    if (file instanceof File) {
      base64File = await this.fileToBase64(file);
    } else {
      base64File = file;
    }

    const mimeType = file instanceof File ? file.type : undefined;
    const filename = file instanceof File ? file.name : undefined;

    return this.request('/upload', {
      method: 'POST',
      body: {
        file: base64File,
        type: 'image',
        mimeType,
        filename,
        ...options,
      } as any,
    });
  }

  /**
   * Upload a single video to Cloudinary
   */
  async uploadVideo(
    file: string | File,
    options?: {
      category?: 'property' | 'profile' | 'document';
      propertyId?: string;
    }
  ) {
    let base64File: string;

    if (file instanceof File) {
      base64File = await this.fileToBase64(file);
    } else {
      base64File = file;
    }

    const mimeType = file instanceof File ? file.type : undefined;
    const filename = file instanceof File ? file.name : undefined;

    return this.request('/upload', {
      method: 'POST',
      body: {
        file: base64File,
        type: 'video',
        mimeType,
        filename,
        ...options,
      } as any,
    });
  }

  /**
   * Upload multiple images at once
   */
  async uploadMultipleImages(
    files: (string | File)[],
    options?: {
      category?: 'property' | 'profile' | 'document';
      propertyId?: string;
    }
  ) {
    const base64Files = await Promise.all(
      files.map(file =>
        file instanceof File ? this.fileToBase64(file) : Promise.resolve(file)
      )
    );

    return this.request('/upload', {
      method: 'PUT',
      body: {
        files: base64Files,
        type: 'image',
        ...options,
      } as any,
    });
  }

  /**
   * Delete uploaded file from Cloudinary
   */
  async deleteUploadedFile(publicId: string, type: 'image' | 'video' = 'image') {
    return this.request(`/upload?publicId=${encodeURIComponent(publicId)}&type=${type}`, {
      method: 'DELETE',
    });
  }

  /**
   * Helper: Convert File to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Booking methods
  async getBookings() {
    return this.request('/bookings');
  }

  async createBooking(bookingData: any) {
    return this.request('/bookings', {
      method: 'POST',
      body: bookingData as any,
    });
  }

  async validateBookingEligibility(roomId: string, userId: string) {
    return this.request('/bookings/validate', {
      method: 'POST',
      body: { roomId, userId } as any,
    });
  }

  async getBookingById(id: string) {
    return this.request(`/bookings/${id}`);
  }

  async updateBookingStatus(id: string, status: string) {
    return this.request(`/bookings/${id}/status`, {
      method: 'PUT',
      body: { status } as any,
    });
  }

  // Advanced Booking Methods

  /**
   * Get booking statistics and analytics
   * @param timeframe - 'week' | 'month' | 'year' | 'all'
   */
  async getBookingStatistics(timeframe: 'week' | 'month' | 'year' | 'all' = 'month') {
    return this.request(`/bookings/statistics?timeframe=${timeframe}`);
  }

  /**
   * Get my bookings organized by categories
   * @param type - 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'upcoming' | 'expiring' | 'overdue_payment' | 'all'
   */
  async getMyBookings(type: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'upcoming' | 'expiring' | 'overdue_payment' | 'all' = 'all') {
    return this.request(`/bookings/my-bookings?type=${type}`);
  }

  /**
   * Perform booking action (owner or student)
   * @param bookingId - Booking ID
   * @param actionData - Action details
   */
  async performBookingAction(bookingId: string, actionData: {
    action: 'approve' | 'reject' | 'activate' | 'complete' | 'cancel' | 'request_extension' | 'approve_extension' | 'reject_extension';
    reason?: string;
    notes?: string;
    extensionDuration?: number;
    extensionId?: string;
    refundAmount?: number;
    damageCharges?: number;
    cleaningCharges?: number;
    utilityCharges?: number;
    meterReadings?: {
      electricity?: number;
      water?: number;
      gas?: number;
    };
    roomCondition?: string;
    photos?: string[];
  }) {
    return this.request(`/bookings/${bookingId}/actions`, {
      method: 'POST',
      body: actionData as any,
    });
  }

  /**
   * Approve a pending booking (Owner only)
   */
  async approveBooking(bookingId: string, notes?: string) {
    return this.performBookingAction(bookingId, {
      action: 'approve',
      notes,
    });
  }

  /**
   * Reject a pending booking (Owner only)
   */
  async rejectBooking(bookingId: string, reason: string) {
    return this.performBookingAction(bookingId, {
      action: 'reject',
      reason,
    });
  }

  /**
   * Cancel a booking (Student or Owner)
   */
  async cancelBooking(bookingId: string, reason: string, refundAmount?: number) {
    return this.performBookingAction(bookingId, {
      action: 'cancel',
      reason,
      refundAmount,
    });
  }

  /**
   * Activate booking / Check-in student (Owner only)
   */
  async checkInStudent(bookingId: string, details?: {
    notes?: string;
    meterReadings?: { electricity?: number; water?: number; gas?: number };
    roomCondition?: string;
    photos?: string[];
  }) {
    return this.performBookingAction(bookingId, {
      action: 'activate',
      ...details,
    });
  }

  /**
   * Complete booking / Check-out student (Owner only)
   */
  async checkOutStudent(bookingId: string, details?: {
    notes?: string;
    meterReadings?: { electricity?: number; water?: number; gas?: number };
    roomCondition?: string;
    photos?: string[];
    damageCharges?: number;
    cleaningCharges?: number;
    utilityCharges?: number;
  }) {
    return this.performBookingAction(bookingId, {
      action: 'complete',
      ...details,
    });
  }

  /**
   * Request booking extension (Student only)
   */
  async requestBookingExtension(bookingId: string, extensionMonths: number, reason?: string) {
    return this.performBookingAction(bookingId, {
      action: 'request_extension',
      extensionDuration: extensionMonths,
      reason,
    });
  }

  /**
   * Approve extension request (Owner only)
   */
  async approveExtension(bookingId: string, extensionId: string) {
    return this.performBookingAction(bookingId, {
      action: 'approve_extension',
      extensionId,
    });
  }

  /**
   * Reject extension request (Owner only)
   */
  async rejectExtension(bookingId: string, extensionId: string, reason: string) {
    return this.performBookingAction(bookingId, {
      action: 'reject_extension',
      extensionId,
      reason,
    });
  }

  // Review methods
  async getReviews(params?: { propertyId?: string; studentId?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/reviews${query ? `?${query}` : ''}`);
  }

  async createReview(reviewData: any) {
    return this.request('/reviews', {
      method: 'POST',
      body: reviewData as any,
    });
  }

  async updateReview(id: string, reviewData: any) {
    return this.request(`/reviews/${id}`, {
      method: 'PUT',
      body: reviewData as any,
    });
  }

  async deleteReview(id: string) {
    return this.request(`/reviews/${id}`, {
      method: 'DELETE',
    });
  }

  // Meeting/Visit methods
  async scheduleMeeting(meetingData: any) {
    return this.request('/meetings', {
      method: 'POST',
      body: meetingData as any,
    });
  }

  async getMeetings(params?: { type?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    const queryString = queryParams.toString();
    return this.request(`/meetings${queryString ? `?${queryString}` : ''}`);
  }

  async updateMeetingStatus(id: string, status: string) {
    return this.request(`/meetings/${id}/status`, {
      method: 'PUT',
      body: { status } as any,
    });
  }

  async respondToMeeting(meetingId: string, responseData: any) {
    return this.request(`/meetings/${meetingId}/respond`, {
      method: 'PUT',
      body: responseData as any,
    });
  }

  async acceptMeetingTime(meetingId: string, timeSlotId: number) {
    return this.request(`/meetings/${meetingId}/accept-time`, {
      method: 'PUT',
      body: { timeSlotId } as any,
    });
  }

  async getMeetingDetails(meetingId: string) {
    return this.request(`/meetings/${meetingId}`);
  }

  async rescheduleMeeting(meetingId: string, rescheduleData: any) {
    return this.request(`/meetings/${meetingId}/reschedule`, {
      method: 'POST',
      body: rescheduleData as any,
    });
  }

  async cancelMeeting(meetingId: string, cancelData: any) {
    return this.request(`/meetings/${meetingId}/cancel`, {
      method: 'POST',
      body: cancelData as any,
    });
  }

  async createGoogleMeet(meetingId: string, meetData: any) {
    return this.request(`/meetings/${meetingId}/google-meet`, {
      method: 'POST',
      body: { action: 'create', ...meetData } as any,
    });
  }

  async joinGoogleMeet(meetingId: string) {
    return this.request(`/meetings/${meetingId}/google-meet`, {
      method: 'POST',
      body: { action: 'join' } as any,
    });
  }

  async endGoogleMeet(meetingId: string) {
    return this.request(`/meetings/${meetingId}/google-meet`, {
      method: 'POST',
      body: { action: 'end' } as any,
    });
  }

  async getGoogleMeetDetails(meetingId: string) {
    return this.request(`/meetings/${meetingId}/google-meet`);
  }

  async submitMeetingRating(meetingId: string, ratingData: any) {
    return this.request(`/meetings/${meetingId}/rating`, {
      method: 'POST',
      body: ratingData as any,
    });
  }

  async getMeetingRating(meetingId: string) {
    return this.request(`/meetings/${meetingId}/rating`);
  }

  async studentRespondToMeeting(meetingId: string, responseData: any) {
    return this.request(`/meetings/${meetingId}/student-respond`, {
      method: 'POST',
      body: responseData as any,
    });
  }

  // ==================== VISIT REQUEST METHODS ====================

  /**
   * Create a new visit request (student or owner can initiate)
   */
  async createVisitRequest(data: {
    propertyId: string;
    recipientId: string;
    timeSlots: Array<{ date: string | Date; startTime: string; endTime: string }>;
    requestType?: string;
    visitType?: string;
    message?: string;
    priority?: string;
    requirements?: string[];
    specialInstructions?: string;
  }) {
    return this.request('/visit-requests', {
      method: 'POST',
      body: data as any,
    });
  }

  /**
   * Fetch visit requests with filters
   */
  async getVisitRequests(params?: {
    type?: 'sent' | 'received' | 'all';
    status?: string;
    filter?: 'pending' | 'upcoming' | 'past';
    requestType?: string;
    propertyId?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.filter) queryParams.append('filter', params.filter);
    if (params?.requestType) queryParams.append('requestType', params.requestType);
    if (params?.propertyId) queryParams.append('propertyId', params.propertyId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return this.request(`/visit-requests${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get visit request details
   */
  async getVisitRequestDetails(requestId: string) {
    return this.request(`/visit-requests/${requestId}`);
  }

  /**
   * Respond to a visit request (accept, decline, counter, etc.)
   */
  async respondToVisitRequest(requestId: string, data: {
    action: 'accept' | 'decline' | 'counter' | 'reschedule' | 'cancel';
    selectedSlot?: { date: string | Date; startTime: string; endTime: string };
    counterProposal?: Array<{ date: string | Date; startTime: string; endTime: string }>;
    message?: string;
  }) {
    return this.request(`/visit-requests/${requestId}`, {
      method: 'PUT',
      body: data as any,
    });
  }

  /**
   * Mark visit as completed/no-show
   */
  async markVisitCompleted(requestId: string, data: {
    attended: boolean;
    rating?: number;
    feedback?: string;
  }) {
    return this.request(`/visit-requests/${requestId}`, {
      method: 'PATCH',
      body: data as any,
    });
  }

  /**
   * Get pending visit requests requiring user action
   */
  async getPendingVisitRequests() {
    return this.request('/visit-requests?filter=pending');
  }

  /**
   * Get upcoming confirmed visits
   */
  async getUpcomingVisits() {
    return this.request('/visit-requests?filter=upcoming');
  }

  /**
   * Get visit request statistics
   */
  async getVisitRequestStats() {
    return this.getVisitRequests({ page: 1, limit: 1 }); // Stats included in response
  }

  // OTP methods
  async sendEmailOtp(email: string) {
    return this.request('/otp/email/send', {
      method: 'POST',
      body: { value: email } as any,
    });
  }

  async verifyEmailOtp(email: string, code: string) {
    return this.request('/otp/email/verify', {
      method: 'POST',
      body: { value: email, code } as any,
    });
  }

  async sendPhoneOtp(phone: string) {
    return this.request('/otp/phone/send', {
      method: 'POST',
      body: { value: phone } as any,
    });
  }

  async verifyPhoneOtp(phone: string, code: string) {
    return this.request('/otp/phone/verify', {
      method: 'POST',
      body: { value: phone, code } as any,
    });
  }

  // Verification methods
  async initiateAadhaarVerification(aadhaarNumber: string) {
    return this.request('/verification/aadhaar/initiate', {
      method: 'POST',
      body: { aadhaarNumber } as any,
    });
  }

  async initiateDigiLockerVerification() {
    return this.request('/verification/digilocker/initiate', {
      method: 'GET',
    });
  }

  // Profile methods
  async getStudentProfile() {
    return this.request('/profile/student', {
      method: 'GET',
    });
  }

  async updateStudentProfile(profileData: any) {
    return this.request('/profile/student', {
      method: 'PUT',
      body: profileData as any,
    });
  }

  async getOwnerProfile() {
    return this.request('/profile/owner', {
      method: 'GET',
    });
  }

  async updateOwnerProfile(profileData: any) {
    return this.request('/profile/owner', {
      method: 'PUT',
      body: profileData as any,
    });
  }

  async uploadAvatar(formData: FormData) {
    return this.request('/profile/upload-avatar', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request('/profile/password', {
      method: 'PUT',
      body: { oldPassword, newPassword } as any,
    });
  }

  // Owner Analytics & Revenue methods
  async getOwnerAnalytics(period: string = 'all') {
    return this.request(`/owner/analytics?period=${period}`, {
      method: 'GET',
    });
  }

  async getOwnerRevenue() {
    return this.request('/owner/revenue', {
      method: 'GET',
    });
  }

  // Forgot password methods
  async forgotPassword(email: string) {
    return this.request('/forgot-password/initiate', {
      method: 'POST',
      body: { email } as any,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request('/forgot-password/reset', {
      method: 'POST',
      body: { token, newPassword } as any,
    });
  }

  async verifyResetToken(token: string) {
    return this.request('/forgot-password/verify-token', {
      method: 'POST',
      body: { token } as any,
    });
  }

  // File upload methods
  async uploadPropertyImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'image');

    return this.request('/upload/property', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async uploadPropertyVideo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'video');

    return this.request('/upload/property', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async deletePropertyMedia(publicId: string) {
    return this.request('/upload/property', {
      method: 'DELETE',
      body: { publicId } as any,
    });
  }

  // Messaging methods
  async getConversations() {
    return this.request('/messages/conversations');
  }

  async getMessages(conversationId: string) {
    return this.request(`/messages/${conversationId}`);
  }

  async sendMessage(conversationId: string, content: string, attachments?: any[]) {
    return this.request('/messages', {
      method: 'POST',
      body: { conversationId, content, attachments } as any,
    });
  }

  async markMessageAsRead(messageId: string) {
    return this.request(`/messages/${messageId}/read`, {
      method: 'PUT',
    });
  }

  // Room sharing methods
  async createRoomSharingRequest(roomId: string, data: any) {
    // Calculate required fields with defaults
    const maxParticipants = data.maxParticipants || 2;
    const rentPerPerson = data.rentPerPerson || 0;
    const totalRent = rentPerPerson * maxParticipants;
    const securityDeposit = data.securityDeposit || totalRent; // Default to 1 month rent

    // Map habits to studyHabits enum - default to 'Balanced' if not specified
    let studyHabitsValue = 'Balanced'; // Default
    const habits = data.preferences?.habits || [];
    if (habits.includes('Studious')) studyHabitsValue = 'Focused';
    else if (habits.includes('Working Professional')) studyHabitsValue = 'Serious';
    else if (habits.includes('Freelancer')) studyHabitsValue = 'Flexible';

    return this.request('/room-sharing', {
      method: 'POST',
      body: {
        propertyId: roomId,
        maxParticipants,
        requirements: {
          gender: data.preferences?.gender || 'any',
          ageRange: data.preferences?.ageRange || { min: 18, max: 65 },
          preferences: data.preferences?.occupation || [],
          lifestyle: data.preferences?.lifestyle || [],
          studyHabits: studyHabitsValue
        },
        costSharing: {
          monthlyRent: totalRent,
          rentPerPerson: rentPerPerson,
          securityDeposit: securityDeposit,
          depositPerPerson: Math.ceil(securityDeposit / maxParticipants),
          maintenanceCharges: data.maintenanceCharges || 0,
          maintenancePerPerson: data.maintenanceCharges ? Math.ceil(data.maintenanceCharges / maxParticipants) : 0,
          utilitiesIncluded: data.utilitiesIncluded || false,
          utilitiesPerPerson: data.utilitiesPerPerson || 0
        },
        description: data.description,
        roomConfiguration: {
          totalBeds: maxParticipants,
          bedsAvailable: maxParticipants - 1, // Initiator takes one bed
          hasPrivateBathroom: data.roomConfiguration?.hasPrivateBathroom || false,
          hasSharedKitchen: data.roomConfiguration?.hasSharedKitchen || true,
          hasStudyArea: data.roomConfiguration?.hasStudyArea || false,
          hasStorage: data.roomConfiguration?.hasStorage || false
        },
        availableFrom: data.availability?.availableFrom || new Date(),
        duration: data.availability?.duration || '6 months',
        houseRules: data.houseRules || [],
        contact: data.contact || {}
      } as any,
    });
  }

  async getRoomSharingRequests(filters?: {
    gender?: string;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/room-sharing${query}`);
  }

  async getRoomShareDetails(shareId: string) {
    return this.request(`/room-sharing/${shareId}`);
  }

  async updateRoomShare(shareId: string, updates: any) {
    return this.request(`/room-sharing/${shareId}`, {
      method: 'PUT',
      body: updates as any,
    });
  }

  async cancelRoomShare(shareId: string) {
    return this.request(`/room-sharing/${shareId}`, {
      method: 'DELETE',
    });
  }

  async applyToRoomShare(shareId: string, message?: string) {
    return this.request(`/room-sharing/${shareId}/apply`, {
      method: 'POST',
      body: { message } as any,
    });
  }

  async withdrawRoomShareApplication(shareId: string) {
    return this.request(`/room-sharing/${shareId}/apply`, {
      method: 'DELETE',
    });
  }

  async respondToRoomSharingApplication(
    shareId: string,
    applicantId: string,
    status: 'accepted' | 'rejected',
    message?: string
  ) {
    return this.request(`/room-sharing/${shareId}/respond`, {
      method: 'POST',
      body: { applicantId, status, message } as any,
    });
  }

  // Compatibility Assessment
  async getCompatibilityAssessment() {
    return this.request('/room-sharing/assessment');
  }

  async createCompatibilityAssessment(assessment: any) {
    return this.request('/room-sharing/assessment', {
      method: 'POST',
      body: assessment as any,
    });
  }

  async updateCompatibilityAssessment(updates: any) {
    return this.request('/room-sharing/assessment', {
      method: 'PUT',
      body: updates as any,
    });
  }

  // My Room Shares
  async getMyRoomShares(type?: 'created' | 'joined' | 'applied') {
    const query = type ? `?type=${type}` : '';
    return this.request(`/room-sharing/my-shares${query}`);
  }

  // Room Sharing Statistics
  async getRoomSharingStatistics() {
    return this.request('/room-sharing/statistics');
  }

  // Interest/Bookmark
  async markRoomShareInterest(shareId: string) {
    return this.request('/room-sharing/interest', {
      method: 'POST',
      body: { shareId } as any,
    });
  }

  async removeRoomShareInterest(shareId: string) {
    return this.request('/room-sharing/interest', {
      method: 'DELETE',
      body: { shareId } as any,
    });
  }

  async getInterestedRoomShares() {
    return this.request('/room-sharing/interest');
  }

  async respondToRoomSharingRequest(requestId: string, status: 'accepted' | 'rejected') {
    return this.request(`/room-sharing/${requestId}/respond`, {
      method: 'PUT',
      body: { status } as any,
    });
  }

  // Dashboard stats methods
  async getStudentStats() {
    return this.request('/dashboard/student/stats');
  }

  async getOwnerStats() {
    return this.request('/dashboard/owner/stats');
  }
}

const apiClient = new ApiClient();
export default apiClient;

// Export individual methods for convenience
export const getStudentProfile = apiClient.getStudentProfile.bind(apiClient);
export const updateStudentProfile = apiClient.updateStudentProfile.bind(apiClient);
export const getOwnerProfile = apiClient.getOwnerProfile.bind(apiClient);
export const updateOwnerProfile = apiClient.updateOwnerProfile.bind(apiClient);
export const uploadAvatar = apiClient.uploadAvatar.bind(apiClient);

// Export meeting methods
export const getMeetings = apiClient.getMeetings.bind(apiClient);
export const scheduleMeeting = apiClient.scheduleMeeting.bind(apiClient);
export const respondToMeeting = apiClient.respondToMeeting.bind(apiClient);
export const acceptMeetingTime = apiClient.acceptMeetingTime.bind(apiClient);
export const getMeetingDetails = apiClient.getMeetingDetails.bind(apiClient);
export const rescheduleMeeting = apiClient.rescheduleMeeting.bind(apiClient);
export const cancelMeeting = apiClient.cancelMeeting.bind(apiClient);
export const createGoogleMeet = apiClient.createGoogleMeet.bind(apiClient);
export const joinGoogleMeet = apiClient.joinGoogleMeet.bind(apiClient);
export const endGoogleMeet = apiClient.endGoogleMeet.bind(apiClient);
export const getGoogleMeetDetails = apiClient.getGoogleMeetDetails.bind(apiClient);
export const submitMeetingRating = apiClient.submitMeetingRating.bind(apiClient);
export const getMeetingRating = apiClient.getMeetingRating.bind(apiClient);
export const studentRespondToMeeting = apiClient.studentRespondToMeeting.bind(apiClient);
export const updateMeetingStatus = apiClient.updateMeetingStatus.bind(apiClient);

// Export visit request methods
export const createVisitRequest = apiClient.createVisitRequest.bind(apiClient);
export const getVisitRequests = apiClient.getVisitRequests.bind(apiClient);
export const getVisitRequestDetails = apiClient.getVisitRequestDetails.bind(apiClient);
export const respondToVisitRequest = apiClient.respondToVisitRequest.bind(apiClient);
export const markVisitCompleted = apiClient.markVisitCompleted.bind(apiClient);
export const getPendingVisitRequests = apiClient.getPendingVisitRequests.bind(apiClient);
export const getUpcomingVisits = apiClient.getUpcomingVisits.bind(apiClient);
export const getVisitRequestStats = apiClient.getVisitRequestStats.bind(apiClient);

// Export room sharing methods
export const createRoomSharingRequest = apiClient.createRoomSharingRequest.bind(apiClient);
export const getRoomSharingRequests = apiClient.getRoomSharingRequests.bind(apiClient);
export const getRoomShareDetails = apiClient.getRoomShareDetails.bind(apiClient);
export const updateRoomShare = apiClient.updateRoomShare.bind(apiClient);
export const cancelRoomShare = apiClient.cancelRoomShare.bind(apiClient);
export const applyToRoomShare = apiClient.applyToRoomShare.bind(apiClient);
export const withdrawRoomShareApplication = apiClient.withdrawRoomShareApplication.bind(apiClient);
export const respondToRoomSharingApplication = apiClient.respondToRoomSharingApplication.bind(apiClient);
export const getCompatibilityAssessment = apiClient.getCompatibilityAssessment.bind(apiClient);
export const createCompatibilityAssessment = apiClient.createCompatibilityAssessment.bind(apiClient);
export const updateCompatibilityAssessment = apiClient.updateCompatibilityAssessment.bind(apiClient);
export const getMyRoomShares = apiClient.getMyRoomShares.bind(apiClient);
export const getRoomSharingStatistics = apiClient.getRoomSharingStatistics.bind(apiClient);
export const markRoomShareInterest = apiClient.markRoomShareInterest.bind(apiClient);
export const removeRoomShareInterest = apiClient.removeRoomShareInterest.bind(apiClient);
export const getInterestedRoomShares = apiClient.getInterestedRoomShares.bind(apiClient);
