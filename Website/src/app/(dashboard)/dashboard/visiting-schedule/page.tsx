"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, RefreshCw, Loader2 } from 'lucide-react';
import MeetingCard from '@/components/meetings/MeetingCard';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

function VisitingSchedulePage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [userRole, setUserRole] = useState<'student' | 'owner'>('student');

  useEffect(() => {
    // Get user role from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role?.toLowerCase() === 'owner' ? 'owner' : 'student');
    }
    fetchMeetings();
  }, []);

  useEffect(() => {
    filterMeetings();
  }, [meetings, searchTerm, statusFilter, typeFilter]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request('/meetings/schedule');

      if (response.success && response.data) {
        const meetingsData = response.data.meetings || response.data || [];
        setMeetings(meetingsData);
        toast.success(`Loaded ${meetingsData.length} meeting${meetingsData.length !== 1 ? 's' : ''}`);
      } else {
        toast.error(response.error || 'Failed to load meetings');
      }
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast.error(error.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const filterMeetings = () => {
    let filtered = [...meetings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((meeting) => {
        const property = meeting.property?.title?.toLowerCase() || '';
        const location = meeting.property?.location?.city?.toLowerCase() || '';
        const studentName = meeting.student?.fullName?.toLowerCase() || '';
        const ownerName = meeting.owner?.fullName?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();

        return property.includes(search) ||
          location.includes(search) ||
          studentName.includes(search) ||
          ownerName.includes(search);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((meeting) => meeting.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((meeting) => meeting.meetingType === typeFilter);
    }

    setFilteredMeetings(filtered);
  };

  const stats = {
    total: meetings.length,
    pending: meetings.filter(m => m.status === 'pending').length,
    confirmed: meetings.filter(m => m.status === 'confirmed').length,
    completed: meetings.filter(m => m.status === 'completed').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visit Requests</h1>
          <p className="text-muted-foreground">
            {userRole === 'student' ? 'Track your property visit requests' : 'Manage property viewing requests'}
          </p>
        </div>
        <Button onClick={fetchMeetings} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="virtual">Online</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meetings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : userRole === 'student'
                  ? 'Schedule your first property visit'
                  : 'No visit requests yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting._id}
              meeting={meeting}
              userRole={userRole}
              onUpdate={fetchMeetings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default VisitingSchedulePage;
