'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Calendar,
  RefreshCw,
  Download,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Filter,
  Eye,
  FileText,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Bar, BarChart } from 'recharts';

interface PaymentStats {
  overview: {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    periodAmount: number;
    periodCount: number;
    periodCompleted: number;
    periodPending: number;
    overdueCount: number;
    overdueAmount: number;
  };
  statusBreakdown: Array<{
    status: string;
    total: number;
    count: number;
    percentage: string;
  }>;
  typeBreakdown: Array<{
    type: string;
    total: number;
    count: number;
    percentage: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    total: number;
    count: number;
    completed: number;
    pending: number;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    property: string;
    student: string;
    createdAt: string;
  }>;
  upcomingPayments: Array<{
    id: string;
    amount: number;
    type: string;
    property: string;
    student: string;
    dueDate: string;
  }>;
}

interface Payment {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  property: {
    id: string;
    title: string;
    location: any;
    image: string;
  };
  amount: number;
  type: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  dueDate: string;
  paidDate: string;
  description: string;
  receiptUrl: string;
  createdAt: string;
}

export default function PaymentsRevenuePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to view payments');
        return;
      }

      // Fetch statistics
      const statsResponse = await fetch(`/api/payments/statistics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const statsResult = await statsResponse.json();

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Fetch payments list
      const paymentsResponse = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const paymentsResult = await paymentsResponse.json();

      if (paymentsResult.success) {
        setPayments(paymentsResult.data.payments);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (paymentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Payment status updated successfully');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      processing: { variant: 'outline', icon: RefreshCw, label: 'Processing' },
      failed: { variant: 'destructive', icon: AlertCircle, label: 'Failed' },
      refunded: { variant: 'outline', icon: ArrowDownRight, label: 'Refunded' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      booking: 'Booking',
      rent: 'Rent',
      deposit: 'Security Deposit',
      maintenance: 'Maintenance',
      late_fee: 'Late Fee',
      refund: 'Refund',
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const exportToCSV = () => {
    // TODO: Implement CSV export
    toast.success('Exporting payment data...');
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesType = typeFilter === 'all' || payment.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments & Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Track your earnings and manage payment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.overview.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.overview.totalCount} total transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Period Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.overview.periodAmount)}
              </div>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                {stats.overview.periodCount} payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payments
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.overview.periodPending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting confirmation
              </p>
            </CardContent>
          </Card>

          <Card className={stats.overview.overdueCount > 0 ? 'border-destructive' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.overview.overdueCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(stats.overview.overdueAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && stats.monthlyTrend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly payment overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyTrend}>
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Completed"
                  />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Pending"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Types</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.typeBreakdown}>
                  <XAxis dataKey="type" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Payments */}
      {stats && stats.upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
            <CardDescription>Due in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingPayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{payment.student}</p>
                      <p className="text-sm text-muted-foreground">{payment.property}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(payment.dueDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Payments</CardTitle>
              <CardDescription>Complete transaction history</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student, property, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          <div className="space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Payments Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Payments will appear here once you receive them'
                  }
                </p>
              </div>
            ) : (
              filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedPayment(payment);
                    setDetailsDialogOpen(true);
                  }}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{payment.student.name}</p>
                        {getStatusBadge(payment.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {payment.property.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="capitalize">{getTypeLabel(payment.type)}</span>
                        <span>•</span>
                        <span>{formatDate(payment.createdAt)}</span>
                        {payment.transactionId && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{payment.transactionId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right mt-3 sm:mt-0">
                    <p className="text-lg font-bold">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {payment.paymentMethod}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete information about this transaction
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Student</p>
                  <p className="font-medium">{selectedPayment.student.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.student.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Property</p>
                  <p className="font-medium">{selectedPayment.property.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Type</p>
                  <p className="font-medium capitalize">{getTypeLabel(selectedPayment.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                  <p className="font-medium capitalize">{selectedPayment.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created Date</p>
                  <p className="font-medium">{formatDate(selectedPayment.createdAt)}</p>
                </div>
                {selectedPayment.paidDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Paid Date</p>
                    <p className="font-medium">{formatDate(selectedPayment.paidDate)}</p>
                  </div>
                )}
                {selectedPayment.transactionId && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Transaction ID</p>
                    <p className="font-mono text-sm">{selectedPayment.transactionId}</p>
                  </div>
                )}
              </div>

              {selectedPayment.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedPayment.description}</p>
                </div>
              )}

              {selectedPayment.status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(selectedPayment.id, 'failed')}
                  >
                    Mark as Failed
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedPayment.id, 'completed')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Payment
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
