import { createClient } from '@/utils/supabase/server';
import TokensContainer from '@/components/tokens/TokensContainer';
import { createToken, revokeToken } from '@/app/actions/tokens';

export default async function TokensPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <TokensContainer
        initialTokens={tokens || []}
        createTokenAction={createToken}
        revokeTokenAction={revokeToken}
      />
    </div>
  );
}
