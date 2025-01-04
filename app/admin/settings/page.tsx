import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/card';
import SettingsFormClient from '@/components/admin/settings-form-client';

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .order('key');

  const { data: rateLimits } = await supabase
    .from('api_rate_limits')
    .select('*, user_roles(role_name)');
  console.log('rateLimits', rateLimits);
  const { data: endpoints } = await supabase
    .from('api_endpoints')
    .select('*')
    .order('path');

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">System Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          <SettingsFormClient 
            settings={settings || []}
            rateLimits={rateLimits || []}
            endpoints={endpoints || []}
          />
        </Card>
      </div>
    </div>
  );
}
