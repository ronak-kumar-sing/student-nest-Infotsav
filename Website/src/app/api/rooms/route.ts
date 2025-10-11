import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/db/connection';
import Room from '../../../lib/models/Room';
import User from '../../../lib/models/User';
import { verifyAccessToken } from '../../../lib/utils/jwt';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    // Pagination with validation
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10'))); // Max 50 items per page
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};

    // City filter (case-insensitive, supports multiple cities)
    const city = searchParams.get('city');
    if (city) {
      const cities = city.split(',').map(c => c.trim());
      filter['location.city'] = { $in: cities.map(c => new RegExp(c, 'i')) };
    }

    // State filter
    const state = searchParams.get('state');
    if (state) {
      filter['location.state'] = new RegExp(state, 'i');
    }

    // Pincode filter
    const pincode = searchParams.get('pincode');
    if (pincode) {
      filter['location.pincode'] = pincode;
    }

    // Price range filter
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }

    // Room type filter (supports multiple types)
    const roomType = searchParams.get('roomType');
    if (roomType) {
      const types = roomType.split(',').map(t => t.trim());
      filter.roomType = { $in: types };
    }

    // Accommodation type filter
    const accommodationType = searchParams.get('accommodationType');
    if (accommodationType) {
      const types = accommodationType.split(',').map(t => t.trim());
      filter.accommodationType = { $in: types };
    }

    // Amenities filter (AND logic - must have all specified amenities)
    const amenities = searchParams.get('amenities');
    if (amenities) {
      const amenitiesList = amenities.split(',').map(a => a.trim());
      filter.amenities = { $all: amenitiesList };
    }

    // Rating filter
    const minRating = searchParams.get('minRating');
    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    // Area filter (square feet)
    const minArea = searchParams.get('minArea');
    const maxArea = searchParams.get('maxArea');
    if (minArea || maxArea) {
      filter['features.area'] = {};
      if (minArea) filter['features.area'].$gte = parseInt(minArea);
      if (maxArea) filter['features.area'].$lte = parseInt(maxArea);
    }

    // Available from date filter
    const availableFrom = searchParams.get('availableFrom');
    if (availableFrom) {
      filter['availability.availableFrom'] = { $lte: new Date(availableFrom) };
    }

    // Gender preference filter
    const genderPreference = searchParams.get('genderPreference');
    if (genderPreference) {
      filter['rules.genderPreference'] = genderPreference;
    }

    // Furnished filter
    const furnished = searchParams.get('furnished');
    if (furnished === 'true' || furnished === 'false') {
      filter['features.furnished'] = furnished === 'true';
    }

    // Balcony filter
    const balcony = searchParams.get('balcony');
    if (balcony === 'true' || balcony === 'false') {
      filter['features.balcony'] = balcony === 'true';
    }

    // Attached bathroom filter
    const attachedBathroom = searchParams.get('attachedBathroom');
    if (attachedBathroom === 'true' || attachedBathroom === 'false') {
      filter['features.attached_bathroom'] = attachedBathroom === 'true';
    }

    // Verified owner filter
    const verifiedOwner = searchParams.get('verifiedOwner');
    if (verifiedOwner === 'true') {
      // This will be applied after population
    }

    // Only show active and available rooms by default (but be flexible for testing)
    // Don't filter by status if not explicitly requested - show all rooms for now
    if (searchParams.get('status')) {
      filter.status = searchParams.get('status');
    }

    // Show both available and unavailable for testing unless explicitly filtered
    if (searchParams.get('availableOnly') === 'true') {
      filter['availability.isAvailable'] = true;
    }

    // Advanced search functionality
    const search = searchParams.get('search');
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { fullDescription: searchRegex },
        { 'location.address': searchRegex },
        { 'location.fullAddress': searchRegex },
        { 'location.city': searchRegex },
        { 'location.state': searchRegex },
        { tags: searchRegex },
      ];
    }

    // Nearby universities filter
    const nearbyUniversity = searchParams.get('nearbyUniversity');
    if (nearbyUniversity) {
      filter['location.nearbyUniversities.name'] = new RegExp(nearbyUniversity, 'i');
    }

    // Maximum distance filter (requires coordinates)
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistance = searchParams.get('maxDistance'); // in kilometers

    if (lat && lng && maxDistance) {
      // Geospatial query
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const distance = parseFloat(maxDistance);

      filter['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: distance * 1000 // Convert km to meters
        }
      };
    }

    // Sorting options
    let sort: any = { createdAt: -1 }; // Default: newest first
    const sortBy = searchParams.get('sortBy');

    switch (sortBy) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { rating: -1, totalReviews: -1 };
        break;
      case 'rating_asc':
        sort = { rating: 1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'area_asc':
        sort = { 'features.area': 1 };
        break;
      case 'area_desc':
        sort = { 'features.area': -1 };
        break;
      case 'popular':
        sort = { totalReviews: -1, rating: -1 };
        break;
      case 'availability':
        sort = { 'availability.availableRooms': -1 };
        break;
    }

    // Get total count for pagination
    const total = await Room.countDocuments(filter);

    // Fetch rooms with owner information
    const rooms = await Room.find(filter)
      .populate('owner', 'fullName email phone profilePhoto isVerified emailVerified phoneVerified averageRating responseRate businessName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter by verified owner if requested (post-population)
    let filteredRooms = rooms;
    if (verifiedOwner === 'true') {
      filteredRooms = rooms.filter((room: any) => room.owner?.isVerified || room.owner?.emailVerified);
    }

    // Format response with enhanced data
    const formattedRooms = filteredRooms.map((room: any) => {
      const occupancyRate = room.totalRooms > 0
        ? Math.round((room.occupiedRooms / room.totalRooms) * 100)
        : 0;

      return {
        id: room._id,
        title: room.title,
        description: room.description,
        price: room.price,
        images: room.images || [],
        roomType: room.roomType,
        accommodationType: room.accommodationType,
        rating: room.rating || 0,
        totalReviews: room.totalReviews || 0,
        amenities: room.amenities || [],
        location: {
          address: room.location?.address || '',
          fullAddress: room.location?.fullAddress || room.location?.address || '',
          city: room.location?.city || 'Unknown',
          state: room.location?.state || 'Unknown',
          pincode: room.location?.pincode || '',
          coordinates: room.location?.coordinates || { lat: 0, lng: 0 },
          nearbyUniversities: room.location?.nearbyUniversities || [],
          nearbyFacilities: room.location?.nearbyFacilities || [],
        },
        features: {
          area: room.features?.area,
          floor: room.features?.floor,
          totalFloors: room.features?.totalFloors,
          furnished: room.features?.furnished,
          balcony: room.features?.balcony,
          attached_bathroom: room.features?.attached_bathroom,
        },
        availability: {
          isAvailable: room.availability.isAvailable,
          availableRooms: room.availability.availableRooms ?? room.availability.totalRooms ?? 1,
          totalRooms: room.availability.totalRooms ?? 1,
          availableFrom: room.availability.availableFrom,
        },
        owner: {
          id: room.owner?._id,
          name: room.owner?.fullName || room.owner?.businessName,
          verified: room.owner?.isVerified || room.owner?.emailVerified || false,
          rating: room.owner?.averageRating || 0,
          responseRate: room.owner?.responseRate || 0,
          email: room.owner?.email,
          phone: room.owner?.phone,
          profilePhoto: room.owner?.profilePhoto,
        },
        occupancyRate,
        totalRooms: room.totalRooms,
        occupiedRooms: room.occupiedRooms,
        isAvailable: room.availability.isAvailable && ((room.availability.availableRooms ?? room.availability.totalRooms ?? 1) > 0),
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: formattedRooms,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        city,
        state,
        pincode,
        minPrice,
        maxPrice,
        roomType,
        accommodationType,
        amenities: amenities?.split(','),
        minRating,
        minArea,
        maxArea,
        availableFrom,
        genderPreference,
        furnished,
        balcony,
        attachedBathroom,
        verifiedOwner,
        search,
        sortBy,
        nearbyUniversity,
        location: lat && lng ? { lat, lng, maxDistance } : null,
      },
      message: `Found ${total} properties`,
    });
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch properties',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please login to create a property listing',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token - Please login again',
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Enhanced validation with detailed error messages
    const requiredFields = {
      title: 'Property title',
      description: 'Property description',
      price: 'Monthly rent',
      roomType: 'Room type (single/shared/studio)',
      accommodationType: 'Accommodation type (pg/hostel/apartment/room)',
      location: 'Location details',
      securityDeposit: 'Security deposit amount',
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `${label} is required`,
            field,
          },
          { status: 400 }
        );
      }
    }

    // Validate location object
    if (!body.location.address || !body.location.city || !body.location.state || !body.location.pincode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Complete location details (address, city, state, pincode) are required',
        },
        { status: 400 }
      );
    }

    // Validate price and deposit
    if (body.price < 0 || body.securityDeposit < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price and security deposit must be positive numbers',
        },
        { status: 400 }
      );
    }

    // Validate images array
    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one property image is required. Please upload images first using /api/upload',
        },
        { status: 400 }
      );
    }

    if (body.images.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 20 images allowed per property',
        },
        { status: 400 }
      );
    }

    // Validate image URLs (should be Cloudinary URLs)
    const invalidImages = body.images.filter((url: string) =>
      !url.startsWith('http://') && !url.startsWith('https://')
    );
    if (invalidImages.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'All images must be valid URLs. Please upload images using /api/upload endpoint',
        },
        { status: 400 }
      );
    }

    // Verify owner exists and has owner role
    const owner = await User.findById(decoded.userId);
    if (!owner) {
      return NextResponse.json(
        {
          success: false,
          error: 'User account not found',
        },
        { status: 404 }
      );
    }

    if (owner.role !== 'owner' && owner.role !== 'Owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only property owners can create listings. Please register as an owner.',
        },
        { status: 403 }
      );
    }

    // Validate amenities if provided
    const validAmenities = [
      'wifi', 'ac', 'powerBackup', 'security', 'laundry', 'housekeeping',
      'gym', 'parking', 'lift', 'water24x7', 'mess', 'tv', 'fridge',
      'microwave', 'washingMachine', 'geyser', 'cctv', 'fireExtinguisher'
    ];

    if (body.amenities && Array.isArray(body.amenities)) {
      const invalidAmenities = body.amenities.filter((a: string) => !validAmenities.includes(a));
      if (invalidAmenities.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid amenities: ${invalidAmenities.join(', ')}`,
            validAmenities,
          },
          { status: 400 }
        );
      }
    }

    // Set default values for optional fields
    const roomData = {
      ...body,
      owner: decoded.userId,
      status: 'active', // Auto-approve for testing
      rating: 0,
      totalReviews: 0,
      occupiedRooms: 0,
      totalRooms: body.totalRooms || (body.roomType === 'shared' ? body.maxSharingCapacity || 2 : 1),
      availability: {
        isAvailable: true,
        availableRooms: body.totalRooms || 1,
        availableFrom: body.availability?.availableFrom || new Date(),
        ...(body.availability || {}),
      },
      amenities: body.amenities || [],
      features: {
        furnished: body.features?.furnished ?? true,
        balcony: body.features?.balcony ?? false,
        attached_bathroom: body.features?.attached_bathroom ?? true,
        ...body.features,
      },
    };

    // Create room
    const room = await Room.create(roomData);

    // Update owner's property count
    if ('properties' in owner) {
      const ownerData = owner as any;
      ownerData.properties = ownerData.properties || [];
      if (room._id) {
        ownerData.properties.push(String(room._id));
      }

      // Update stats if exists
      if ('stats' in ownerData) {
        ownerData.stats = ownerData.stats || {};
        ownerData.stats.totalProperties = (ownerData.stats.totalProperties || 0) + 1;
        ownerData.stats.activeListings = (ownerData.stats.activeListings || 0) + 1;
      }

      await owner.save();
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          roomId: room._id,
          title: room.title,
          status: room.status,
          price: room.price,
          location: {
            city: room.location.city,
            address: room.location.address,
          },
          images: room.images,
        },
        message: 'Property listing created successfully! Your property is now live and visible to students.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating room:', error);

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create property listing. Please try again.',
      },
      { status: 500 }
    );
  }
}
