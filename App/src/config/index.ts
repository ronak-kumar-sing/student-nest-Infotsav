import Constants from 'expo-constants';

// Load environment variables from expo config or fallback to defaults
const extra = Constants.expoConfig?.extra || {};

interface Config {
  apiBaseUrl: string;
  googleMapsApiKey: string;
  cloudinary: {
    cloudName: string;
    uploadUrl: string;
    uploadPreset: string;
  };
  auth: {
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    maxLoginAttempts: number;
    lockTimeHours: number;
  };
  features: {
    mockVerification: boolean;
    enableEmailVerification: boolean;
    enableSmsVerification: boolean;
  };
}

export const config: Config = {
  apiBaseUrl: 'http://student-nest-for.vercel.app/api',
  googleMapsApiKey: extra.googleMapsApiKey || '',
  cloudinary: {
    cloudName: extra.cloudinaryCloudName || 'dyvv2furt',
    uploadUrl: extra.cloudinaryUrl || 'https://api.cloudinary.com/v1_1/dyvv2furt/upload',
    uploadPreset: extra.cloudinaryUploadPreset || 'student_nest_mobile',
  },
  auth: {
    jwtExpiresIn: extra.jwtExpiresIn || '7d',
    jwtRefreshExpiresIn: extra.jwtRefreshExpiresIn || '30d',
    maxLoginAttempts: Number(extra.maxLoginAttempts) || 5,
    lockTimeHours: Number(extra.lockTimeHours) || 2,
  },
  features: {
    mockVerification: extra.mockVerification === 'true',
    enableEmailVerification: extra.enableEmailVerification === 'true',
    enableSmsVerification: extra.enableSmsVerification === 'true',
  },
};