'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface ApiEndpoint {
  id: string
  path: string
  method: string
  description: string | null
  required_roles: string[]
  is_public: boolean
  cache_strategy: string
  cache_ttl_seconds: number
}

interface ApiTesterProps {
  tokens: Array<{
    id: string
    name: string
    token: string
  }>
  endpoints: ApiEndpoint[]
}

interface ApiResponse {
  status: number
  data: any
  headers: Record<string, string>
  time: number
}

export default function ApiTester({ tokens, endpoints }: ApiTesterProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [selectedToken, setSelectedToken] = useState('none')
  const [headers, setHeaders] = useState('')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)

  const handleEndpointSelect = (endpointId: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId)
    if (endpoint) {
      setSelectedEndpoint(endpoint)
      setMethod(endpoint.method)
      setUrl(`${baseUrl}${endpoint.path}`)
    }
  }

  const handleTest = async () => {
    try {
      setLoading(true)
      const startTime = performance.now()

      // Parse headers
      const headerObj: Record<string, string> = {}
      if (headers.trim()) {
        headers.split('\\n').forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim())
          if (key && value) headerObj[key] = value
        })
      }

      // Add token if selected
      if (selectedToken && selectedToken !== 'none') {
        headerObj['Authorization'] = `Bearer ${selectedToken}`
      }

      // Make request
      const response = await fetch(url, {
        method,
        headers: headerObj,
        body: method !== 'GET' && body ? body : undefined
      })

      const endTime = performance.now()

      // Get response headers
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      // Set response data
      setResponse({
        status: response.status,
        data: await response.json().catch(() => null),
        headers: responseHeaders,
        time: Math.round(endTime - startTime)
      })
    } catch (error) {
      setResponse({
        status: 0,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        headers: {},
        time: 0
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Request Panel */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleTest() }} className="space-y-4">
            <div>
              <Label>Endpoint</Label>
              <Select onValueChange={handleEndpointSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an endpoint" />
                </SelectTrigger>
                <SelectContent>
                  {endpoints.map((endpoint) => (
                    <SelectItem key={endpoint.id} value={endpoint.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant={endpoint.is_public ? "secondary" : "default"}>
                          {endpoint.method}
                        </Badge>
                        <span className="font-mono text-sm">{endpoint.path}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEndpoint && (
                <div className="mt-2 space-y-2">
                  {selectedEndpoint.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedEndpoint.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {selectedEndpoint.is_public ? (
                      <Badge variant="secondary">Public</Badge>
                    ) : (
                      <Badge variant="default">Protected</Badge>
                    )}
                    {selectedEndpoint.required_roles.map(role => (
                      <Badge key={role} variant="outline">{role}</Badge>
                    ))}
                    <Badge variant="outline">
                      Cache: {selectedEndpoint.cache_strategy} ({selectedEndpoint.cache_ttl_seconds}s)
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>URL</Label>
              <Input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                placeholder={`${baseUrl}/api/endpoint`}
                required
              />
            </div>

            <div>
              <Label>Token</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Token</SelectItem>
                  {tokens.map((token) => (
                    <SelectItem key={token.id} value={token.token}>
                      {token.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Headers (one per line)</Label>
              <Textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="Content-Type: application/json"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="{}"
                className="font-mono text-sm"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Testing...' : 'Test Endpoint'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Response Panel */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="response" className="w-full">
            <TabsList>
              <TabsTrigger value="response">Response</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="response" className="space-y-4">
              {response && (
                <>
                  <div className="flex items-center gap-4">
                    <div className={`px-2 py-1 rounded text-sm ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {response.status}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {response.time}ms
                    </div>
                  </div>
                  <Textarea
                    value={JSON.stringify(response.data, null, 2)}
                    readOnly
                    className="font-mono text-sm h-[400px]"
                  />
                </>
              )}
            </TabsContent>
            
            <TabsContent value="headers">
              {response && (
                <Textarea
                  value={Object.entries(response.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\\n')}
                  readOnly
                  className="font-mono text-sm h-[400px]"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
