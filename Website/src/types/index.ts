// ============ USER TYPES ============

export interface User {
  _id: string;
  email: string;
  phone: string;
  fullName: string;
  profilePhoto: string | null;
  role: 'student' | 'owner' | 'Student' | 'Owner';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  identityVerificationRequired: boolean;
  identityVerificationSkipped: boolean;
  savedRooms: string[];
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============ STUDENT TYPES ============

export interface StudentPreferences {
  roomTypePreference: ('single' | 'shared' | 'studio' | 'pg')[];
  budgetMin: number;
  budgetMax: number;
  locationPreferences: string[];
  amenityPreferences: string[];
}

export interface StudentVerification {
  status: 'pending' | 'in-review' | 'verified' | 'rejected';
  collegeIdCard?: string;
  aadhaarCard?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface Student extends User {
  role: 'student' | 'Student';
  collegeId: string;
  collegeName: string;
  course?: string;
  yearOfStudy?: number;
  city?: string;
  state?: string;
  bio?: string;
  preferences: StudentPreferences;
  verification: StudentVerification;
  lastActive: Date;
  viewCount: number;
  savedProperties: string[];
  profileCompleteness: number;
}

// ============ OWNER TYPES ============

export interface OwnerAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
}

export interface DigilockerData {
  name?: string;
  dob?: Date;
  gender?: string;
  address?: string;
}

export interface VerificationDocument {
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface OwnerVerification {
  status: 'pending' | 'in-review' | 'verified' | 'rejected';
  aadhaarNumber?: string;
  aadhaarDocument?: string;
  digilockerLinked: boolean;
  digilockerData?: DigilockerData;
  verificationDocuments: VerificationDocument[];
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface DashboardStats {
  totalProperties?: number;
  activeListings?: number;
  totalRevenue?: number;
  pendingVisits?: number;
  unreadMessages?: number;
  savedProperties?: number;
  activeApplications?: number;
  scheduledVisits?: number;
}

// Room and Property Types
export interface RoomFeatures {
  area?: number;
  floor?: number;
  totalFloors?: number;
  furnished: boolean;
  balcony: boolean;
  attached_bathroom: boolean;
}

export interface RoomLocation {
  address: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  nearbyUniversities?: Array<{
    name: string;
    distance: string;
    commute: string;
  }>;
  nearbyFacilities?: Array<{
    name: string;
    distance: string;
    type?: 'metro' | 'bus' | 'hospital' | 'mall' | 'market' | 'restaurant' | 'gym' | 'bank';
  }>;
}

export interface RoomAvailability {
  isAvailable: boolean;
  availableFrom: Date;
  totalRooms: number;
  availableRooms: number;
}

export interface RoomRules {
  guestsAllowed: boolean;
  smokingAllowed: boolean;
  alcoholAllowed: boolean;
  petsAllowed: boolean;
  genderPreference: 'male' | 'female' | 'any';
  curfewTime: string;
}

export type RoomType = 'single' | 'shared' | 'studio';
export type AccommodationType = 'pg' | 'hostel' | 'apartment' | 'room';
export type RoomStatus = 'active' | 'inactive' | 'pending' | 'blocked';
export type ElectricityCharges = 'included' | 'extra' | 'shared';

export type AmenityType =
  | 'wifi'
  | 'ac'
  | 'powerBackup'
  | 'security'
  | 'housekeeping'
  | 'laundry'
  | 'parking'
  | 'gym'
  | 'library'
  | 'cafeteria'
  | 'cctv'
  | 'geyser'
  | 'cooler'
  | 'fridge'
  | 'tv'
  | 'bed'
  | 'wardrobe'
  | 'study_table'
  | 'chair';

export interface Room {
  _id: string;
  title: string;
  description: string;
  fullDescription?: string;
  price: number;
  images: string[];
  roomType: RoomType;
  accommodationType: AccommodationType;
  maxSharingCapacity: number;
  features: RoomFeatures;
  location: RoomLocation;
  amenities: AmenityType[];
  detailedAmenities: string[];
  availability: RoomAvailability;
  owner: string | User;
  rating: number;
  totalReviews: number;
  status: RoomStatus;
  securityDeposit: number;
  maintenanceCharges: number;
  electricityCharges: ElectricityCharges;
  rules: RoomRules;
  totalRooms: number;
  occupiedRooms: number;
  tags: string[];
  isVerified: boolean;
  verificationNotes?: string;
  totalBookings: number;
  monthlyRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

// Review Types
export interface ReviewCategories {
  cleanliness: number;
  location: number;
  facilities: number;
  owner: number;
  value: number;
}

export interface Review {
  _id: string;
  property: string | Room;
  student: string | Student;
  booking?: string;
  overallRating: number;
  categories: ReviewCategories;
  comment?: string;
  stayDuration: string;
  isVerified: boolean;
  helpfulCount: number;
  helpfulUsers: string[];
  images: string[];
  isApproved: boolean;
  moderationNotes?: string;
  ownerResponse?: {
    message: string;
    respondedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Booking Types
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'rejected';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'online' | 'cash' | 'bank_transfer' | 'upi';
export type AgreementType = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export interface PaymentDetails {
  securityDepositPaid: number;
  firstMonthRentPaid: number;
  maintenancePaid: number;
  totalPaid: number;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  paymentDate?: Date;
}

export interface Booking {
  _id: string;
  room: string | Room;
  student: string | Student;
  owner: string | Owner;
  moveInDate: Date;
  moveOutDate?: Date;
  duration: number;
  monthlyRent: number;
  securityDeposit: number;
  maintenanceCharges: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentDetails: PaymentDetails;
  agreementType: AgreementType;
  agreementDocument?: {
    url: string;
    uploadedAt: Date;
  };
  studentNotes?: string;
  ownerNotes?: string;
  adminNotes?: string;
  confirmedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  cancellationReason?: string;
  cancelledBy?: string;
  refundAmount: number;
  refundStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  checkInDetails?: {
    checkedInAt?: Date;
    checkedInBy?: string;
    notes?: string;
    meterReadings?: {
      electricity?: number;
      water?: number;
      gas?: number;
    };
    roomCondition?: string;
    photos?: string[];
  };
  checkOutDetails?: {
    checkedOutAt?: Date;
    checkedOutBy?: string;
    notes?: string;
    meterReadings?: {
      electricity?: number;
      water?: number;
      gas?: number;
    };
    roomCondition?: string;
    photos?: string[];
    damageCharges?: number;
    cleaningCharges?: number;
    utilityCharges?: number;
    finalSettlement?: number;
  };
  extensionRequests?: Array<{
    _id?: string;
    requestedBy: string;
    requestedAt: Date;
    extensionMonths: number;
    reason?: string;
    newMoveOutDate: Date;
    status: 'pending' | 'approved' | 'rejected';
    respondedBy?: string;
    respondedAt?: Date;
    rejectionReason?: string;
  }>;
  studentReviewSubmitted?: boolean;
  ownerReviewSubmitted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Owner extends User {
  role: 'owner' | 'Owner';
  city?: string;
  state?: string;
  bio?: string;
  businessName?: string;
  businessType: 'individual' | 'company' | 'partnership';
  businessDescription?: string;
  gstNumber?: string;
  experience?: number;
  licenseNumber?: string;
  address: OwnerAddress;
  verification: OwnerVerification;
  properties: string[];
  stats: {
    totalProperties: number;
    activeListings: number;
    totalBookings: number;
    monthlyRevenue: number;
    averageRating: number;
    responseRate: number;
    responseTime: string;
  };
  profileCompleteness: number;
}

// ============ OTP TYPES ============

export interface OTP {
  _id: string;
  identifier: string; // email or phone
  type: 'email' | 'phone';
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
}

// ============ AUTH TYPES ============

export interface LoginInput {
  identifier: string;
  password: string;
  role?: 'student' | 'owner';
}

export interface StudentSignupInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  collegeId: string;
  collegeName: string;
}

export interface OwnerSignupInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface OTPVerificationInput {
  identifier: string;
  code: string;
  type: 'email' | 'phone';
}

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============ MEETING TYPES ============

export interface Meeting {
  _id: string;
  studentId: string;
  ownerId: string;
  propertyId: string;
  scheduledAt: Date;
  duration: number;
  type: 'virtual' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
  meetLink?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
