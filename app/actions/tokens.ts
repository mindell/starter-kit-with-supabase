'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createToken(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const expiresIn = formData.get('expiresIn') as string;

  const { data, error } = await supabase
    .from('api_tokens')
    .insert([
      {
        name,
        description,
        expires_at: expiresIn === 'never' ? null : 
          new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString(),
        user_id: user.id,
        status: 'active'
      }
    ])
    .select()
    .single();

  if (error) throw error;
  
  revalidatePath('/cms/tokens');
  return data;
}

export async function revokeToken(formData: FormData) {
  const supabase = await createClient();
  const tokenId = formData.get('tokenId') as string;

  const { error } = await supabase
    .from('api_tokens')
    .update({ status: 'revoked' })
    .eq('id', tokenId);

  if (error) throw error;
  
  revalidatePath('/cms/tokens');
}
