"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { X, Search, Filter, SlidersHorizontal } from 'lucide-react';

interface FilterProps {
  priceRange: number[];
  setPriceRange: (range: number[]) => void;
  availabilityFilter: {
    availableNow: boolean;
    availableNextMonth: boolean;
  };
  setAvailabilityFilter: (filter: { availableNow: boolean; availableNextMonth: boolean }) => void;
  roomTypeFilter: {
    single: boolean;
    shared: boolean;
    pg: boolean;
    hostel: boolean;
    apartment: boolean;
    studio: boolean;
  };
  setRoomTypeFilter: (filter: any) => void;
  amenityFilter: {
    wifi: boolean;
    parking: boolean;
    security: boolean;
    kitchen: boolean;
    laundry: boolean;
    gym: boolean;
    ac: boolean;
    heating: boolean;
  };
  setAmenityFilter: (filter: any) => void;
  locationFilter: string;
  setLocationFilter: (location: string) => void;
  ratingFilter: number;
  setRatingFilter: (rating: number) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  areaRange: number[];
  setAreaRange: (range: number[]) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export default function FilterComponent({
  priceRange,
  setPriceRange,
  availabilityFilter,
  setAvailabilityFilter,
  roomTypeFilter,
  setRoomTypeFilter,
  amenityFilter,
  setAmenityFilter,
  locationFilter,
  setLocationFilter,
  ratingFilter,
  setRatingFilter,
  sortBy,
  setSortBy,
  areaRange,
  setAreaRange,
  onClearFilters,
  activeFiltersCount,
}: FilterProps) {
  return (
    <Card className="h-fit sticky top-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            <CardTitle className="text-xl">Filters</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Location Search */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              placeholder="City, Address, or University..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Price Range</Label>
            <span className="text-sm font-medium">
              ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
            </span>
          </div>
          <Slider
            min={2000}
            max={25000}
            step={500}
            value={priceRange}
            onValueChange={setPriceRange}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>₹2,000</span>
            <span>₹25,000</span>
          </div>
        </div>

        <Separator />

        {/* Area Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Area (sq ft)</Label>
            <span className="text-sm font-medium">
              {areaRange[0]} - {areaRange[1]} sq ft
            </span>
          </div>
          <Slider
            min={50}
            max={500}
            step={10}
            value={areaRange}
            onValueChange={setAreaRange}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>50 sq ft</span>
            <span>500 sq ft</span>
          </div>
        </div>

        <Separator />

        {/* Availability */}
        <div className="space-y-3">
          <Label>Availability</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="available-now"
                checked={availabilityFilter.availableNow}
                onCheckedChange={(checked) =>
                  setAvailabilityFilter({
                    ...availabilityFilter,
                    availableNow: checked as boolean,
                  })
                }
              />
              <label
                htmlFor="available-now"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Available Now
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="available-next-month"
                checked={availabilityFilter.availableNextMonth}
                onCheckedChange={(checked) =>
                  setAvailabilityFilter({
                    ...availabilityFilter,
                    availableNextMonth: checked as boolean,
                  })
                }
              />
              <label
                htmlFor="available-next-month"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Available Next Month
              </label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Room Type */}
        <div className="space-y-3">
          <Label>Room Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(roomTypeFilter).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`room-type-${key}`}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setRoomTypeFilter({
                      ...roomTypeFilter,
                      [key]: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor={`room-type-${key}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                >
                  {key}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Amenities */}
        <div className="space-y-3">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(amenityFilter).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`amenity-${key}`}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setAmenityFilter({
                      ...amenityFilter,
                      [key]: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor={`amenity-${key}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                >
                  {key}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Minimum Rating */}
        <div className="space-y-3">
          <Label>Minimum Rating</Label>
          <Select
            value={ratingFilter.toString()}
            onValueChange={(value) => setRatingFilter(parseFloat(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any Rating</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="3.5">3.5+ Stars</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="4.5">4.5+ Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Sort By */}
        <div className="space-y-3">
          <Label>Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Select sorting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="area">Area: Largest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
