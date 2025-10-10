"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessagesSquare } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-2">
          Chat with property owners and other students
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5" />
              Message Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your conversations will appear here.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This feature is under development. Check back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
