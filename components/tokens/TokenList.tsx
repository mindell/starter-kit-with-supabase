'use client'
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { useFormStatus } from 'react-dom';

interface Token {
  id: string;
  name: string;
  description: string;
  created_at: string;
  expires_at: string | null;
  status: 'active' | 'revoked';
  last_used_at: string | null;
}

interface TokenListProps {
  tokens: Token[];
  revokeTokenAction: (formData: FormData) => Promise<void>;
}

function RevokeButton({ tokenId }: { tokenId: string }) {
  const { pending } = useFormStatus();
  
  return (
    <Button
      variant="destructive"
      size="sm"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Revoking...' : 'Revoke'}
    </Button>
  );
}

export default function TokenList({ tokens, revokeTokenAction }: TokenListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map((token) => (
          <TableRow key={token.id}>
            <TableCell>
              <div>
                <div className="font-medium">{token.name}</div>
                {token.description && (
                  <div className="text-sm text-gray-500">{token.description}</div>
                )}
              </div>
            </TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}
            </TableCell>
            <TableCell>
              {token.expires_at
                ? formatDistanceToNow(new Date(token.expires_at), { addSuffix: true })
                : 'Never'}
            </TableCell>
            <TableCell>
              {token.last_used_at
                ? formatDistanceToNow(new Date(token.last_used_at), { addSuffix: true })
                : 'Never'}
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  token.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {token.status}
              </span>
            </TableCell>
            <TableCell>
              {token.status === 'active' && (
                <form action={revokeTokenAction}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <RevokeButton tokenId={token.id} />
                </form>
              )}
            </TableCell>
          </TableRow>
        ))}
        {tokens.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4">
              No tokens found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
