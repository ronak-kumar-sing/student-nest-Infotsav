'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  CreditCard,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  displayAmount: string;
  currency: string;
  status: string;
  method?: string;
  description?: string;
  receipt?: string;
  booking?: {
    id: string;
    checkIn: string;
    checkOut: string;
  };
  property?: {
    id: string;
    title: string;
    location: any;
  };
  refund?: {
    refundId: string;
    amount: number;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function PaymentHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, [currentPage, activeTab]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to view payment history');
      }

      const statusFilter = activeTab !== 'all' ? `&status=${activeTab}` : '';
      const response = await fetch(
        `/api/payments/history?page=${currentPage}&limit=10${statusFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setTransactions(result.data.transactions);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        throw new Error(result.error || 'Failed to load payment history');
      }
    } catch (error: any) {
      console.error('Load transactions error:', error);
      toast.error(error.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      captured: { label: 'Successful', variant: 'default', icon: CheckCircle },
      authorized: { label: 'Authorized', variant: 'secondary', icon: Clock },
      created: { label: 'Pending', variant: 'outline', icon: Clock },
      failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
      refunded: { label: 'Refunded', variant: 'outline', icon: RefreshCw },
    };

    const config = statusConfig[status] || statusConfig.created;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadReceipt = (transaction: Transaction) => {
    // TODO: Implement receipt download
    toast.info('Receipt download coming soon!');
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600 dark:text-gray-400">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View all your transactions and payment details
          </p>
        </div>
        <Button onClick={loadTransactions} variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="captured">Successful</TabsTrigger>
          <TabsTrigger value="created">Pending</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No transactions found
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CreditCard className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{transaction.description}</h3>
                          {getStatusBadge(transaction.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Amount</p>
                            <p className="font-semibold text-lg">
                              ₹{transaction.displayAmount} {transaction.currency}
                            </p>
                          </div>

                          {transaction.method && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Payment Method</p>
                              <p className="font-medium capitalize">{transaction.method}</p>
                            </div>
                          )}

                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Transaction ID</p>
                            <p className="font-mono text-xs">{transaction.orderId}</p>
                          </div>

                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Date</p>
                            <p className="font-medium">{formatDate(transaction.createdAt)}</p>
                          </div>

                          {transaction.property && (
                            <div className="md:col-span-2">
                              <p className="text-gray-500 dark:text-gray-400">Property</p>
                              <p className="font-medium">{transaction.property.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {transaction.property.location?.city}, {transaction.property.location?.state}
                              </p>
                            </div>
                          )}

                          {transaction.refund && (
                            <div className="md:col-span-2">
                              <p className="text-gray-500 dark:text-gray-400">Refund Details</p>
                              <p className="font-medium">
                                ₹{(transaction.refund.amount / 100).toFixed(2)} - {transaction.refund.status}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(transaction)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </p>

              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
