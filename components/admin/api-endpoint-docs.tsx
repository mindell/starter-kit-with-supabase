import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ApiEndpointDocsProps {
  endpoint: {
    path: string;
    method: string;
    cache_strategy: string;
    cache_ttl_seconds: number;
    required_roles: string[];
    is_active: boolean;
  };
}

export default function ApiEndpointDocs({ endpoint }: ApiEndpointDocsProps) {
  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get':
        return 'bg-green-100 text-green-800';
      case 'post':
        return 'bg-blue-100 text-blue-800';
      case 'put':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExampleResponse = (path: string) => {
    if (path.includes('/posts')) {
      return {
        posts: [
          {
            id: 'uuid',
            title: 'Example Post',
            slug: 'example-post',
            content: 'Post content...',
            author: {
              id: 'uuid',
              name: 'John Doe',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          pages: 10,
        },
      };
    } else if (path.includes('/categories')) {
      return {
        categories: [
          {
            id: 'uuid',
            name: 'Example Category',
            slug: 'example-category',
            description: 'Category description...',
            posts: {
              count: 10,
            },
          },
        ],
      };
    } else if (path.includes('/tags')) {
      return {
        tags: [
          {
            id: 'uuid',
            name: 'Example Tag',
            slug: 'example-tag',
            description: 'Tag description...',
            posts: {
              count: 5,
            },
          },
        ],
      };
    }
    return { message: 'Example response' };
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge className={getMethodColor(endpoint.method)}>
            {endpoint.method}
          </Badge>
          <code className="text-sm">{endpoint.path}</code>
        </div>
        <Badge variant={endpoint.is_active ? 'default' : 'secondary'}>
          {endpoint.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Accordion type="single" collapsible className="mt-4">
        <AccordionItem value="details">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Cache Strategy</h4>
                <p className="text-sm text-gray-600">
                  {endpoint.cache_strategy} (TTL: {endpoint.cache_ttl_seconds}s)
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Required Roles</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {endpoint.required_roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Example Response</h4>
                <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
                  {JSON.stringify(getExampleResponse(endpoint.path), null, 2)}
                </pre>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
