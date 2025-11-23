import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, Eye } from "lucide-react";

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
            Please read and accept the terms before starting the {courseName} -{" "}
            {difficulty} test
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">
                  Test Rules & Restrictions
                </h4>
                <div className="bg-red-100 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
                        ⚠️ ZERO-TOLERANCE POLICY
                      </h3>
                      <p className="text-red-800 dark:text-red-300 font-semibold">
                        Opening Developer Tools, Inspector, or Console during
                        the test will result in:
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 ml-9">
                    <li className="flex items-center gap-2 text-red-900 dark:text-red-200">
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      <span>
                        <strong>INSTANT PERMANENT BAN</strong> from this course
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-red-900 dark:text-red-200">
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      <span>
                        <strong>-10 Points</strong> penalty
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-red-900 dark:text-red-200">
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      <span>
                        <strong>No warnings given</strong> - First offense = Ban
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-red-900 dark:text-red-200">
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      <span>
                        <strong>No appeals</strong> - All detections are final
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Monitored Actions */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-bold text-yellow-900 dark:text-yellow-200">
                      Monitored Activities
                    </h4>
                  </div>
                  <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                    <li>✗ Opening Browser DevTools (F12, Ctrl+Shift+I)</li>
                    <li>✗ Right-click "Inspect Element"</li>
                    <li>✗ Console access</li>
                    <li>✗ Window resize manipulation</li>
                    <li>✗ Performance debugging</li>
                    <li>✗ Copy-pasting code/answers</li>
                  </ul>
                </div>

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
                  <li>
                    • Your session will be monitored for security violations
                  </li>
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
              By proceeding, you agree to follow all test guidelines and
              understand that violations may result in test termination.
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
