import { NextRequest, NextResponse } from 'next/server';

// API endpoints should not be prerendered
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Dynamically import Stripe only when needed
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

    const { productId, email } = await request.json();

    if (!productId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isLifetime = productId === 'lifetime_one_time';
    const stripePriceId = isLifetime
      ? process.env.STRIPE_PRICE_LIFETIME
      : process.env.STRIPE_PRICE_PRO_MONTHLY ?? process.env.STRIPE_PRICE_MONTHLY;

    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Price not configured' },
        { status: 500 }
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      metadata: {
        plan: isLifetime ? 'lifetime' : 'pro',
      },
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: isLifetime ? 'payment' : 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
