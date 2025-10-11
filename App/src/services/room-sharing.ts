import { config } from '@/src/config';
import { api } from './api';

const apiUrl = config.apiBaseUrl;

export const roomSharingService = {
  // Get all room listings
  async getRoomListings() {
    console.log(`Fetching room listings from ${apiUrl}/room-sharing`);
    return api.request('/room-sharing');
  },

  // Get room details
  async getRoomDetails(roomId: string) {
    console.log(`Fetching room details from ${apiUrl}/room-sharing/${roomId}`);
    return api.request(`/room-sharing/${roomId}`);
  },

  // Create room listing
  async createRoomListing(data: any) {
    console.log(`Creating room listing at ${apiUrl}/room-sharing`);
    return api.request('/room-sharing', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};