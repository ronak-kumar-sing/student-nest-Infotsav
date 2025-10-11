'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Home,
  Plus,
  Edit,
  Eye,
  MapPin,
  Users,
  DollarSign,
  Star,
  Loader2,
  AlertCircle,
  Power,
  PowerOff,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Building,
  Bed,
  Bath,
  Grid,
  List,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import apiClient from '../../lib/api';

interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  roomType: string;
  accommodationType: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  images: string[];
  amenities: string[];
  features: any;
  availability: {
    isAvailable: boolean;
  };
  status: string;
  totalRooms: number;
  occupiedRooms: number;
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export default function OwnerPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [searchTerm, properties, activeTab]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found. Please log in.');
      }

      const response = await fetch('/api/properties/my-properties', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setProperties(result.data.properties || []);
      } else {
        throw new Error(result.error || 'Failed to load properties');
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      setError(error instanceof Error ? error.message : 'Failed to load properties');
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    let filtered = properties;

    // Filter by status tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => {
        if (activeTab === 'active') return p.status === 'active' && p.availability.isAvailable;
        if (activeTab === 'inactive') return !p.availability.isAvailable;
        if (activeTab === 'occupied') return p.occupiedRooms > 0;
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.location.city?.toLowerCase().includes(term) ||
        p.location.address?.toLowerCase().includes(term)
      );
    }

    setFilteredProperties(filtered);
  };

  const handlePropertyAction = async (propertyId: string, action: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to perform this action');
        return;
      }

      const response = await fetch('/api/properties/my-properties', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyId, action }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Property ${action}d successfully`);
        loadProperties();
      } else {
        throw new Error(result.error || `Failed to ${action} property`);
      }
    } catch (error) {
      console.error(`Error ${action}ing property:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} property`);
    }
  };

  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;

    try {
      await handlePropertyAction(selectedProperty._id, 'delete');
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const getOccupancyRate = (property: Property) => {
    if (property.totalRooms === 0) return 0;
    return Math.round((property.occupiedRooms / property.totalRooms) * 100);
  };

  const getStatusBadge = (property: Property) => {
    if (!property.availability.isAvailable) {
      return <Badge variant="secondary" className="gap-1"><PowerOff className="h-3 w-3" /> Inactive</Badge>;
    }
    if (property.occupiedRooms === property.totalRooms) {
      return <Badge variant="destructive" className="gap-1"><Users className="h-3 w-3" /> Full</Badge>;
    }
    if (property.occupiedRooms > 0) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Partially Occupied</Badge>;
    }
    return <Badge variant="outline" className="gap-1 border-green-500 text-green-700"><Power className="h-3 w-3" /> Available</Badge>;
  };

  const getAvailableRooms = (property: Property) => {
    return property.totalRooms - property.occupiedRooms;
  };

  const stats = {
    total: properties.length,
    active: properties.filter(p => p.availability.isAvailable).length,
    occupied: properties.filter(p => p.occupiedRooms > 0).length,
    totalRevenue: properties.reduce((sum, p) => sum + (p.price * p.occupiedRooms), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Error Loading Properties</h3>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <Button onClick={loadProperties}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your property listings
          </p>
        </div>
        <Link href="/owner/post-property">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Property
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Properties
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active} active listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Occupancy
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupied}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Properties with tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              From {stats.occupied} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Rating
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.length > 0
                ? (properties.reduce((sum, p) => sum + p.rating, 0) / properties.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all properties
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, city, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-4">
          <TabsTrigger value="all">All ({properties.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="occupied">Occupied ({stats.occupied})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({properties.length - stats.active})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredProperties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Get started by adding your first property'
                  }
                </p>
                {!searchTerm && (
                  <Link href="/owner/post-property">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {filteredProperties.map((property) => (
                <Card key={property._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {viewMode === 'grid' ? (
                    <>
                      {/* Image */}
                      <div className="relative h-48 bg-muted">
                        {property.images.length > 0 ? (
                          <Image
                            src={property.images[0]}
                            alt={property.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Home className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          {getStatusBadge(property)}
                        </div>
                        <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/rooms/${property._id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/owner/properties/${property._id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePropertyAction(
                                  property._id,
                                  property.availability.isAvailable ? 'deactivate' : 'activate'
                                )}
                              >
                                {property.availability.isAvailable ? (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Content */}
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="line-clamp-1">{property.title}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {property.location?.city || 'Unknown'}, {property.location?.state || 'Unknown'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Price */}
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">
                            ₹{property.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>

                        {/* Details */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Bed className="h-4 w-4" />
                            <span className="capitalize">{property.roomType}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{getAvailableRooms(property)}/{property.totalRooms} available</span>
                          </div>
                        </div>

                        {/* Occupancy Bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Occupancy</span>
                            <span className="font-medium">{getOccupancyRate(property)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${getOccupancyRate(property)}%` }}
                            />
                          </div>
                        </div>

                        {/* Rating */}
                        {property.totalReviews > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{property.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({property.totalReviews} reviews)
                            </span>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="gap-2">
                        <Link href={`/rooms/${property._id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/owner/properties/${property._id}/edit`} className="flex-1">
                          <Button className="w-full">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                      </CardFooter>
                    </>
                  ) : (
                    // List View
                    <div className="flex gap-4 p-4">
                      <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        {property.images.length > 0 ? (
                          <Image
                            src={property.images[0]}
                            alt={property.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Home className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property.location?.city || 'Unknown'}, {property.location?.state || 'Unknown'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(property)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/rooms/${property._id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/owner/properties/${property._id}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePropertyAction(
                                    property._id,
                                    property.availability.isAvailable ? 'deactivate' : 'activate'
                                  )}
                                >
                                  {property.availability.isAvailable ? (
                                    <>
                                      <PowerOff className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Power className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedProperty(property);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="font-semibold">₹{property.price.toLocaleString()}/mo</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{property.roomType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Availability</p>
                            <p className="font-medium">{getAvailableRooms(property)}/{property.totalRooms} rooms</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Occupancy</p>
                            <p className="font-medium">{getOccupancyRate(property)}%</p>
                          </div>
                        </div>

                        {property.totalReviews > 0 && (
                          <div className="flex items-center gap-2 mt-3">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{property.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({property.totalReviews} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProperty?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProperty}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
