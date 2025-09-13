const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  console.log('Create drop function called!'); // Add this for debugging
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Request body:', event.body); // Debug log
    
    // Parse request body
    const {
      title,
      quantity,
      price_cents,
      story,
      image_url,
      shipping_info,
      returns_info,
      theme
    } = JSON.parse(event.body);

    console.log('Parsed data:', { title, price_cents, image_url }); // Debug log

    // Validate required fields
    if (!title || !price_cents || !image_url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: title, price, or image' 
        })
      };
    }

    // Validate price minimum
    if (price_cents < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Price must be at least $1.00' 
        })
      };
    }

    // Validate theme
    const validThemes = ['minimal', 'dark', 'warm'];
    if (!validThemes.includes(theme)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid theme selection' 
        })
      };
    }

    // Get user from auth header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Verify JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid authentication' })
      };
    }

    // DRAFT MODE: Skip Stripe onboarding check for MVP
    // TODO: Re-enable Stripe verification after MVP validation phase
    console.log('Creating draft listing for user:', user.id);

    // Create the listing as draft (no Stripe requirement)
    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert({
        user_id: user.id,
        title: title.trim(),
        story: story?.trim() || null,
        price_cents: parseInt(price_cents),
        quantity: parseInt(quantity) || 1,
        image_url,
        theme,
        shipping_info: shipping_info?.trim() || null,
        returns_info: returns_info?.trim() || null,
        status: 'draft' // Mark as draft until payment setup complete
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create listing' })
      };
    }

    // Generate checkout URL (we'll implement the checkout page next)
    const checkoutUrl = `${process.env.URL || 'http://localhost:8888'}/listing/${listing.id}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: true,
        data: listing,
        checkout_url: checkoutUrl,
        is_draft: true,
        message: 'Draft listing created! Complete payment setup to start accepting orders.'
      })
    };

  } catch (error) {
    console.error('Create drop error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};