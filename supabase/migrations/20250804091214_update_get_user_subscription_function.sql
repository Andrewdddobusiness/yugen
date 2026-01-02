-- Update the get_user_subscription function with correct column references
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  out_subscription_id TEXT,
  out_current_period_end TIMESTAMP WITH TIME ZONE,
  out_stripe_customer_id TEXT,
  out_currency TEXT,
  out_attrs JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.stripe_subscription_id::TEXT as out_subscription_id,
    s.current_period_end as out_current_period_end,
    s.stripe_customer_id::TEXT as out_stripe_customer_id,
    s.currency::TEXT as out_currency,
    s.attrs as out_attrs
  FROM profiles p
  LEFT JOIN subscriptions s ON p.user_id = s.user_id
  WHERE p.user_id = user_uuid
  AND (s.status = 'active' OR s.status IS NULL)
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;;
