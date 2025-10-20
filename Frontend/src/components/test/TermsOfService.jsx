import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Clock, AlertTriangle, CheckCircle } from "lucide-react";

const TermsOfService = ({ onAccept, onCancel, courseName, difficulty }) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Test Terms & Conditions</CardTitle>
          <CardDescription>
            Please read and accept the terms before starting the {courseName} - {difficulty} test
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Test Rules & Restrictions</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Once started, you cannot switch difficulty levels</li>
                  <li>• The test must be completed in one session</li>
                  <li>• You cannot go back to previous questions</li>
                  <li>• Timer cannot be paused once started</li>
                  <li>• Tab switching or window changes are monitored</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Security & Monitoring</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Your session will be monitored for security violations</li>
                  <li>• Multiple violations may result in test termination</li>
                  <li>• Screen recording or screenshots are prohibited</li>
                  <li>• Use of external resources is not allowed</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Technical Requirements</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Stable internet connection required</li>
                  <li>• JavaScript must be enabled</li>
                  <li>• Pop-up blockers should be disabled</li>
                  <li>• Use latest version of supported browsers</li>
                </ul>
              </div>
            </div>
          </ScrollArea>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              By proceeding, you agree to follow all test guidelines and understand that violations may result in test termination.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="terms" 
              checked={accepted} 
              onCheckedChange={setAccepted}
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and agree to the terms and conditions
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onAccept} 
            disabled={!accepted}
            className="min-w-[120px]"
          >
            Start Test
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TermsOfService;