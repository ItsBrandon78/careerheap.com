import { NextRequest, NextResponse } from 'next/server';

// Webhook endpoints should not be prerendered
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Dynamically import Stripe only when needed
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    // Dynamically import admin client at runtime
    const { createAdminClient } = await import('@/lib/supabase/admin');

    // Handle subscription events
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      
      // Get customer email
      if (subscription.customer) {
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        if (customer && 'email' in customer && customer.email) {
          const supabase = createAdminClient();

          // Update user profile to pro if subscription is active
          if (subscription.status === 'active') {
            // Get user by email
            const { data: users } = await supabase.auth.admin.listUsers();
            const user = users?.users.find((u) => u.email === customer.email);

            if (user) {
              await supabase
                .from('profiles')
                .update({
                  plan: 'pro',
                  stripe_customer_id: customer.id,
                })
                .eq('id', user.id);
            }
          }
        }
      }
    }

    // Handle subscription deleted
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      if (subscription.customer) {
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        if (customer && 'email' in customer && customer.email) {
          const { createAdminClient } = await import('@/lib/supabase/admin');
          const supabase = createAdminClient();

          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users?.users.find((u) => u.email === customer.email);

          if (user) {
            await supabase
              .from('profiles')
              .update({ plan: 'free' })
              .eq('id', user.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
