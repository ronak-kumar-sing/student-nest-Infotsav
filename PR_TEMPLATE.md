## 🗺️ Map-Based Location Filtering System

### 📋 Description
This PR implements a comprehensive map-based location filtering system for Student Nest, allowing students to find accommodation based on their preferred locations.

### ✨ Key Features
- **Interactive Google Maps Integration**
  - Click to select location on map
  - Search for locations by name
  - Current location detection
  - Reverse geocoding for addresses

- **Smart Location Management**
  - Save up to 3 preferred locations
  - Quick-select from saved locations
  - Distance-based filtering (5km radius)
  - Persistent storage in database

- **Room Filtering**
  - Filter rooms by distance from selected location
  - Haversine formula for accurate distance calculation
  - Combine with other filters (price, amenities)
  - Clear filter to see all rooms

### 🔧 Technical Implementation
- **Frontend**: React components with Google Maps API
- **Backend**: RESTful API with MongoDB
- **Authentication**: JWT with role-based access
- **Testing**: Comprehensive test suite


