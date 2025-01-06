'use client'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy } from 'lucide-react';

interface TokenFormProps {
  onTokenCreated: (token: any) => void;
  createTokenAction: (formData: FormData) => Promise<any>;
}

export default function TokenForm({ onTokenCreated, createTokenAction }: TokenFormProps) {
  const [expiresIn, setExpiresIn] = useState('never');
  const [showToken, setShowToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { pending } = useFormStatus();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Prevent default form submission
    const formData = new FormData(event.currentTarget);
    const token = await createTokenAction(formData);
    if (token) {
      setNewToken(token.token);
      setShowToken(true);
      onTokenCreated(token);
      // Reset form
      const form = document.querySelector('form') as HTMLFormElement;
      form?.reset();
      setExpiresIn('never');
    }
  }

  const copyToClipboard = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Token Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="My API Token"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Used for..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiresIn">Expires In</Label>
          <Select 
            value={expiresIn} 
            onValueChange={setExpiresIn}
            name="expiresIn"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select expiration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create Token'}
        </Button>
      </form>

      <Dialog open={showToken} onOpenChange={setShowToken}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your New API Token</DialogTitle>
            <DialogDescription>
              Make sure to copy your API token now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-muted p-4 rounded-md flex items-center justify-between">
              <code className="text-sm break-all">{newToken}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="ml-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
