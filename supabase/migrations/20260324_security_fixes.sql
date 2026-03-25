-- Fix bling_tokens: remove insecure policy, restrict to service_role
DROP POLICY IF EXISTS "allow_all_bling_tokens" ON bling_tokens;
CREATE POLICY "service_role_only" ON bling_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Fix shopify_tokens: same pattern
DROP POLICY IF EXISTS "shopify_tokens_all" ON shopify_tokens;
CREATE POLICY "service_role_only" ON shopify_tokens
  FOR ALL USING (auth.role() = 'service_role');
