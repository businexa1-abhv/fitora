'use client';

import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Platform configuration and preferences"
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform info</CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">Platform name</Label>
                <Input id="platform-name" defaultValue="FitOra" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">Support email</Label>
                <Input id="support-email" type="email" defaultValue="support@fitora.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="api-url">API URL</Label>
                <Input id="api-url" defaultValue={process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'} disabled />
              </div>
              <Button>Save changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification channels</CardTitle>
              <CardDescription>Configure how users receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Email notifications', desc: 'Booking confirmations, receipts' },
                { label: 'SMS notifications', desc: 'OTP and booking reminders' },
                { label: 'Push notifications', desc: 'Mobile app alerts via Firebase' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment gateway</CardTitle>
              <CardDescription>Razorpay configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Mock payment mode</p>
                  <p className="text-xs text-muted-foreground">Use for development without Razorpay keys</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="razorpay-key">Razorpay Key ID</Label>
                <Input id="razorpay-key" placeholder="rzp_live_..." />
              </div>
              <Button>Save payment settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize the admin dashboard look</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-xs text-muted-foreground">Currently: {theme ?? 'system'}</p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-lg border p-4 text-sm font-medium capitalize transition-colors ${
                      theme === t ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
