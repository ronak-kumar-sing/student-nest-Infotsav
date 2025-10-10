// Comprehensive amenities list for StudentNest
import {
  Wifi,
  Car,
  Shield,
  ChefHat,
  Home,
  Snowflake,
  Utensils,
  Bath,
  Tv,
  Gamepad2,
  BookOpen,
  Lightbulb,
  Volume2,
  Users,
  Camera,
  KeyRound,
  AlertTriangle,
  UserCheck,
  Droplets,
  Zap,
  Thermometer,
  Recycle,
  FlameKindling,
  Dumbbell,
  Waves,
  Coffee,
  Briefcase,
  Bike,
  Bus,
  Bed,
  Armchair,
  Wind,
  UtensilsCrossed,
  ShowerHead,
  Monitor,
  Building,
  type LucideIcon
} from 'lucide-react';

// Type definitions
interface Amenity {
  name: string;
  icon: LucideIcon;
  description: string;
}

interface AmenityCategory {
  name: string;
  items: Record<string, Amenity>;
}

interface RoomType {
  name: string;
  icon: LucideIcon;
}

interface AccommodationType {
  name: string;
  description: string;
}

// Comprehensive amenities categorization
export const AMENITIES_CATEGORIES: Record<string, AmenityCategory> = {
  FURNISHED: {
    name: '🛏️ Fully Furnished Rooms',
    items: {
      'furnished-bed': { name: 'Bed', icon: Bed, description: 'Comfortable bed with mattress' },
      'study-table': { name: 'Study Table', icon: Monitor, description: 'Dedicated study table' },
      'chair': { name: 'Chair', icon: Armchair, description: 'Study chair' },
      'wardrobe': { name: 'Wardrobe', icon: Home, description: 'Storage wardrobe' }
    }
  },
  CLIMATE: {
    name: '❄️ Air Conditioning / Heating',
    items: {
      'ac': { name: 'Air Conditioning', icon: Snowflake, description: 'Air conditioning system' },
      'heating': { name: 'Heating', icon: Thermometer, description: 'Room heating system' },
      'fan': { name: 'Ceiling Fan', icon: Wind, description: 'Ceiling fan for ventilation' }
    }
  },
  FOOD_SERVICES: {
    name: '🍽️ Mess / Meal Services',
    items: {
      'mess': { name: 'Mess Facility', icon: UtensilsCrossed, description: 'In-house mess service' },
      'meal-plan': { name: 'Meal Plan', icon: Utensils, description: 'Optional meal plan available' },
      'kitchenette': { name: 'Private Kitchenette', icon: ChefHat, description: 'Personal cooking space' },
      'kitchen': { name: 'Shared Kitchen', icon: ChefHat, description: 'Common kitchen access' }
    }
  },
  BATHROOM: {
    name: '🛁 Bathroom Facilities',
    items: {
      'attached-bathroom': { name: 'Attached Bathroom', icon: Bath, description: 'Private attached bathroom' },
      'shared-bathroom': { name: 'Shared Bathroom', icon: Bath, description: 'Clean shared bathroom' },
      'geyser': { name: 'Geyser/Hot Water', icon: ShowerHead, description: 'Hot water facility' }
    }
  },
  COMMON_AREAS: {
    name: '📺 Common Areas',
    items: {
      'tv-lounge': { name: 'TV Lounge', icon: Tv, description: 'Common area with TV' },
      'recreation': { name: 'Recreation Area', icon: Gamepad2, description: 'Games and entertainment' },
      'common-area': { name: 'Common Area', icon: Users, description: 'Shared social space' }
    }
  },
  STUDENT_AMENITIES: {
    name: '🧑‍🎓 Student-Friendly Amenities',
    items: {
      'study-desk': { name: 'Study Desk & Chair', icon: BookOpen, description: 'Dedicated study furniture' },
      'study-lighting': { name: 'Study Lighting', icon: Lightbulb, description: 'Adequate study lighting' },
      'quiet-zones': { name: 'Quiet Study Zones', icon: Volume2, description: 'Designated quiet areas' },
      'community-events': { name: 'Community Events', icon: Users, description: 'Networking and social events' }
    }
  },
  SAFETY_SECURITY: {
    name: '🛡️ Safety & Security',
    items: {
      'cctv': { name: 'CCTV Surveillance', icon: Camera, description: '24/7 CCTV monitoring' },
      'biometric': { name: 'Biometric Access', icon: KeyRound, description: 'Secure biometric entry' },
      'smart-lock': { name: 'Smart Lock', icon: KeyRound, description: 'Digital lock system' },
      'security': { name: 'Security Guard', icon: Shield, description: '24/7 security personnel' },
      'emergency-services': { name: 'Emergency Services', icon: AlertTriangle, description: 'Quick emergency response' },
      'verified-tenants': { name: 'Verified Tenants', icon: UserCheck, description: 'Background verified residents' }
    }
  },
  UTILITIES: {
    name: '⚡ Utilities',
    items: {
      'wifi': { name: 'Wi-Fi', icon: Wifi, description: 'High-speed internet' },
      'water-24x7': { name: '24x7 Water Supply', icon: Droplets, description: 'Round the clock water' },
      'powerBackup': { name: 'Power Backup', icon: Zap, description: 'Emergency power backup' },
      'solar-water': { name: 'Solar Water Heating', icon: Thermometer, description: 'Eco-friendly hot water' },
      'waste-management': { name: 'Waste Management', icon: Recycle, description: 'Proper waste disposal' },
      'gas-connection': { name: 'Gas Connection', icon: FlameKindling, description: 'LPG gas supply' }
    }
  },
  FITNESS_RECREATION: {
    name: '🏋️ Fitness & Recreation',
    items: {
      'gym': { name: 'Gym/Fitness Center', icon: Dumbbell, description: 'Fitness equipment' },
      'swimming-pool': { name: 'Swimming Pool', icon: Waves, description: 'Swimming facility' },
      'sports-area': { name: 'Sports Area', icon: Gamepad2, description: 'Outdoor sports facilities' },
      'cafeteria': { name: 'Cafeteria', icon: Coffee, description: 'On-site cafeteria' }
    }
  },
  BUSINESS_STUDY: {
    name: '💼 Business & Study',
    items: {
      'conference-room': { name: 'Conference/Meeting Room', icon: Briefcase, description: 'Professional meeting space' },
      'coworking-space': { name: 'Co-working Space', icon: Monitor, description: 'Shared working area' },
      'library': { name: 'Library', icon: BookOpen, description: 'Study library' },
      'printing': { name: 'Printing Services', icon: Monitor, description: 'Printing and scanning' }
    }
  },
  TRANSPORT: {
    name: '🚗 Transportation',
    items: {
      'parking': { name: 'Parking', icon: Car, description: 'Vehicle parking space' },
      'bike-parking': { name: 'Bike Parking', icon: Bike, description: 'Two-wheeler parking' },
      'shuttle-service': { name: 'Shuttle Service', icon: Bus, description: 'Transportation to campus' },
      'nearby-transport': { name: 'Public Transport', icon: Bus, description: 'Easy access to public transport' }
    }
  },
  SERVICES: {
    name: '🧺 Additional Services',
    items: {
      'laundry': { name: 'Laundry Service', icon: Recycle, description: 'Washing and cleaning service' },
      'housekeeping': { name: 'Housekeeping', icon: Home, description: 'Regular cleaning service' },
      'maintenance': { name: 'Maintenance', icon: AlertTriangle, description: '24/7 maintenance support' },
      'concierge': { name: 'Concierge Service', icon: UserCheck, description: 'Personal assistance' }
    }
  }
};

// Flatten all amenities for easy lookup
export const AMENITIES_LIST: Record<string, Amenity> = Object.values(AMENITIES_CATEGORIES).reduce((acc, category) => {
  return { ...acc, ...category.items };
}, {});

// Quick access arrays for common use cases
export const BASIC_AMENITIES = ['wifi', 'parking', 'security', 'kitchen', 'laundry'];
export const PREMIUM_AMENITIES = ['ac', 'gym', 'swimming-pool', 'housekeeping', 'concierge'];
export const STUDENT_ESSENTIALS = ['wifi', 'study-desk', 'study-lighting', 'quiet-zones', 'library'];

// Room Types
export const ROOM_TYPES: Record<string, RoomType> = {
  single: { name: 'Single Room', icon: Bed },
  shared: { name: 'Shared Room', icon: Users },
  pg: { name: 'PG', icon: Building },
  hostel: { name: 'Hostel', icon: Building },
  apartment: { name: 'Apartment', icon: Home },
  studio: { name: 'Studio', icon: Home }
};

// Accommodation Types
export const ACCOMMODATION_TYPES: Record<string, AccommodationType> = {
  room: { name: 'Room', description: 'Individual room rental' },
  pg: { name: 'PG', description: 'Paying Guest accommodation' }
};
