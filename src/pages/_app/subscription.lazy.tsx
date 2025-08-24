import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, BookOpen } from "lucide-react";
import { useCreateCheckoutSession, useCreatePortalSession } from "@/lib/api/mutations";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useIsPaidUser } from "@/lib/api/queries";

export const Route = createLazyFileRoute("/_app/subscription")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { data: isPaidUser } = useIsPaidUser();
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreatePortalSession();
  const [isYearly, setIsYearly] = useState(true);

  const handleUpgrade = async () => {
    if (!isPaidUser) {
      const plan = isYearly ? "yearly" : "monthly";
      const res = await checkoutMutation.mutateAsync(plan);
      if (res?.url) window.location.href = res.url;
    } else {
      const res = await portalMutation.mutateAsync();
      if (res?.url) window.location.href = res.url;
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-4xl w-full p-6">
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground mb-4">Unlock unlimited reading with our affordable subscription</p>
          <div className="flex items-center gap-2 justify-center">
            <span className={`text-xs ${!isYearly ? "font-bold" : ""}`}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-xs ${isYearly ? "font-bold" : ""}`}>Yearly</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <CardTitle>Free Trial</CardTitle>
                </div>
                {!isPaidUser && <Badge variant="secondary">Current</Badge>}
              </div>
              <CardDescription>Perfect for trying out the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-3xl font-bold">$0</div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Upload up to 5 books</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">AI-powered reading assistant</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Text Highlighting</span>
                </li>
              </ul>

              <Link to="/library">
                <Button variant="outline" className="w-full">
                  Continue with Free
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Premium</CardTitle>
                </div>
                {isPaidUser && <Badge variant="secondary">Current</Badge>}
              </div>
              <CardDescription className="flex w-full justify-between">For serious readers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-3xl font-bold">{isYearly ? "$24.99" : "$2.99"}</div>
                <div className="text-sm text-muted-foreground">{isYearly ? "per year" : "per month"}</div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Unlimited book uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">AI-powered reading assistant</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">All future features included</span>
                </li>
              </ul>

              <Button
                onClick={handleUpgrade}
                className="w-full"
                disabled={checkoutMutation.isPending || portalMutation.isPending}
              >
                {isPaidUser ? "Manage Subscription" : isYearly ? "Upgrade to Yearly" : "Upgrade to Monthly"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
