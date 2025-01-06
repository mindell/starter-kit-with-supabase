'use client'

import { useState } from 'react'
import TokenForm from './TokenForm'
import TokenList from './TokenList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface TokensContainerProps {
  initialTokens: any[]
  createTokenAction: (formData: FormData) => Promise<any>
  revokeTokenAction: (formData: FormData) => Promise<void>
}

export default function TokensContainer({ 
  initialTokens, 
  createTokenAction, 
  revokeTokenAction 
}: TokensContainerProps) {
  const [tokens, setTokens] = useState(initialTokens)

  const handleTokenCreated = (newToken: any) => {
    setTokens(prev => [newToken, ...prev])
  }

  const handleTokenRevoked = async (formData: FormData) => {
    const tokenId = formData.get('tokenId') as string
    await revokeTokenAction(formData)
    setTokens(prev => prev.map(token => 
      token.id === tokenId 
        ? { ...token, status: 'revoked' }
        : token
    ))
  }

  return (
    <div className="grid gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create New Token</h2>
          <Link href="/cms/posts">
            <Button variant="outline">View API Docs</Button>
          </Link>
        </div>
        <TokenForm 
          onTokenCreated={handleTokenCreated} 
          createTokenAction={createTokenAction}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Your Tokens</h2>
        <TokenList 
          tokens={tokens} 
          revokeTokenAction={handleTokenRevoked}
        />
      </div>
    </div>
  )
}
