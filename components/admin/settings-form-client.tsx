'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface SettingsFormProps {
  settings: Array<{
    key: string;
    value: any;
    description?: string;
  }>;
  rateLimits: Array<{
    role_id: string;
    user_roles: { role_name: string };
    requests_per_minute: number;
    requests_per_hour: number;
    requests_per_day: number;
  }>;
  endpoints: Array<{
    id: string;
    path: string;
    method: string;
    cache_strategy: 'in_memory' | 'redis' | 'cdn';
    cache_ttl_seconds: number;
    is_active: boolean;
  }>;
}

export default function SettingsFormClient({ settings, rateLimits, endpoints }: SettingsFormProps) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [loading, setLoading] = useState(false);

  const updateSetting = async (key: string, value: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
      toast({
        title: 'Settings updated',
        description: 'The system settings have been updated successfully.',
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRateLimit = async (roleId: string, data: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('api_rate_limits')
        .update(data)
        .eq('role_id', roleId);

      if (error) throw error;
      toast({
        title: 'Rate limits updated',
        description: 'The API rate limits have been updated successfully.',
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEndpoint = async (id: string, data: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('api_endpoints')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Endpoint updated',
        description: 'The API endpoint has been updated successfully.',
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
        <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="grid gap-2">
            <Label htmlFor={setting.key}>{setting.key}</Label>
            <Input
              id={setting.key}
              defaultValue={
                typeof setting.value === 'string'
                  ? setting.value
                  : JSON.stringify(setting.value)
              }
              disabled={loading}
              onBlur={(e) => {
                try {
                  const value =
                    setting.value && typeof setting.value !== 'string'
                      ? JSON.parse(e.target.value)
                      : e.target.value;
                  updateSetting(setting.key, value);
                } catch (error) {
                  toast({
                    title: 'Invalid JSON',
                    description: 'Please enter valid JSON for this setting.',
                    variant: 'destructive',
                  });
                }
              }}
            />
            {setting.description && (
              <p className="text-sm text-gray-500">{setting.description}</p>
            )}
          </div>
        ))}
      </TabsContent>

      <TabsContent value="rate-limits">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Requests/Minute</TableHead>
              <TableHead>Requests/Hour</TableHead>
              <TableHead>Requests/Day</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rateLimits.map((limit) => (
              <>
                {limit.user_roles && 
                    <TableRow key={limit.role_id}>
                    <TableCell>{limit.user_roles?.role_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={limit.requests_per_minute}
                        disabled={loading}
                        onBlur={(e) =>
                          updateRateLimit(limit.role_id, {
                            requests_per_minute: parseInt(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={limit.requests_per_hour}
                        disabled={loading}
                        onBlur={(e) =>
                          updateRateLimit(limit.role_id, {
                            requests_per_hour: parseInt(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={limit.requests_per_day}
                        disabled={loading}
                        onBlur={(e) =>
                          updateRateLimit(limit.role_id, {
                            requests_per_day: parseInt(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                }
              </>
              
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="endpoints">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Cache Strategy</TableHead>
              <TableHead>Cache TTL</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((endpoint) => (
              <TableRow key={endpoint.id}>
                <TableCell>{endpoint.path}</TableCell>
                <TableCell>{endpoint.method}</TableCell>
                <TableCell>
                  <select
                    className="w-full p-2 border rounded"
                    defaultValue={endpoint.cache_strategy}
                    disabled={loading}
                    onChange={(e) =>
                      updateEndpoint(endpoint.id, {
                        cache_strategy: e.target.value,
                      })
                    }
                  >
                    <option value="in_memory">In Memory</option>
                    <option value="redis">Redis</option>
                    <option value="cdn">CDN</option>
                  </select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    defaultValue={endpoint.cache_ttl_seconds}
                    disabled={loading}
                    onBlur={(e) =>
                      updateEndpoint(endpoint.id, {
                        cache_ttl_seconds: parseInt(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant={endpoint.is_active ? 'default' : 'secondary'}
                    disabled={loading}
                    onClick={() =>
                      updateEndpoint(endpoint.id, {
                        is_active: !endpoint.is_active,
                      })
                    }
                  >
                    {endpoint.is_active ? 'Active' : 'Inactive'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}
