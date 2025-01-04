import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiEndpointDocs from '@/components/admin/api-endpoint-docs';

export default async function ApiDocsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: endpoints } = await supabase
    .from('api_endpoints')
    .select('*')
    .order('path');

  // Group endpoints by their base path
  const groupedEndpoints = endpoints?.reduce((acc: any, endpoint) => {
    const basePath = endpoint.path.split('/')[1];
    if (!acc[basePath]) {
      acc[basePath] = [];
    }
    acc[basePath].push(endpoint);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">API Documentation</h1>
      </div>

      <Card className="p-6">
        <div className="prose max-w-none">
          <h2>Authentication</h2>
          <p>
            All API endpoints require authentication using a Bearer token. You can obtain
            a token by logging in through the authentication endpoints.
          </p>
          <pre className="bg-gray-100 p-4 rounded">
            Authorization: Bearer your-token-here
          </pre>

          <h2 className="mt-8">Rate Limiting</h2>
          <p>
            API requests are rate-limited based on your role. The current limits are
            returned in the response headers:
          </p>
          <ul>
            <li>X-RateLimit-Limit: Maximum requests allowed</li>
            <li>X-RateLimit-Remaining: Remaining requests in the current window</li>
            <li>X-RateLimit-Reset: Time when the rate limit resets</li>
          </ul>

          <h2 className="mt-8">Endpoints</h2>
        </div>

        <Tabs defaultValue={Object.keys(groupedEndpoints || {})[0]} className="mt-6">
          <TabsList>
            {Object.keys(groupedEndpoints || {}).map((group) => (
              <TabsTrigger key={group} value={group}>
                {group.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedEndpoints || {}).map(([group, endpoints]) => (
            <TabsContent key={group} value={group}>
              <div className="space-y-8">
                {(endpoints as any[]).map((endpoint) => (
                  <ApiEndpointDocs
                    key={endpoint.id}
                    endpoint={endpoint}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}
