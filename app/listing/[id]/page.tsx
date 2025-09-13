'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Listing {
  id: string;
  user_id: string;
  title: string;
  story: string | null;
  price_cents: number;
  quantity: number;
  sold_count: number;
  image_url: string;
  theme: 'minimal' | 'dark' | 'warm';
  shipping_info: string;
  returns_info: string;
  status: string;
  created_at: string;
}

interface ListingPageProps {
  params: {
    id: string;
  };
}

export default function ListingPage({ params }: ListingPageProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Check current user authentication
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);

      // Fetch listing data
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        setListing(null);
      } else {
        setListing(data);
        // Check if current user is the creator
        setIsCreator(session?.user?.id === data.user_id);
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', data.theme);
      }
      setLoading(false);
    }

    fetchData();
  }, [params.id]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!listing) {
    return <div className="not-found">Listing not found</div>;
  }

  const price = (listing.price_cents / 100).toFixed(2);
  const isAvailable = ['active', 'draft'].includes(listing.status) && listing.quantity > listing.sold_count;

  return (
    <>
      <div className="listing-container">
        {/* Creator Banner - Only shown to listing owner */}
        {isCreator && (
          <div className="creator-banner">
            <div className="banner-content">
              <h3>This is your listing</h3>
              <p>Complete payment setup to start accepting orders</p>
              <button 
                className="setup-button"
                onClick={() => alert('Stripe Connect onboarding coming next!')}
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* Main Listing Content */}
        <div className="listing-content">
          <img 
            src={listing.image_url} 
            alt={listing.title}
            className="product-image"
          />

          <div className="product-details">
            <h1 className="product-title">{listing.title}</h1>
            <div className="product-price">${price}</div>
            
            {listing.story && (
              <div className="product-story">
                <p>{listing.story}</p>
              </div>
            )}

            <div className="product-info">
              <div className="info-section">
                <h3>Shipping</h3>
                <p>{listing.shipping_info}</p>
              </div>
              <div className="info-section">
                <h3>Returns</h3>
                <p>{listing.returns_info}</p>
              </div>
            </div>

            {isAvailable ? (
              <button 
                className="buy-button" 
                onClick={() => {
                  if (listing.status === 'draft') {
                    alert('This seller is completing payment setup - they\'ll be able to accept orders soon!');
                  } else {
                    alert('Stripe checkout integration coming next!');
                  }
                }}
              >
                Buy Now - ${price}
              </button>
            ) : (
              <div className="unavailable">
                <p>This item is no longer available</p>
              </div>
            )}

            <div className="powered-by">
              Powered by <strong>Blink.shop</strong>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        :root[data-theme="minimal"] {
          --bg: #ffffff;
          --text: #111111;
          --sublabel-text: #666666;
          --card-bg: #ffffff;
          --border: #e1e5e9;
          --button-bg: #222222;
          --button-text: #ffffff;
          --banner-bg: #f0f9ff;
          --banner-border: #bae6fd;
          --banner-text: #0369a1;
        }

        :root[data-theme="dark"] {
          --bg: #111111;
          --text: #ffffff;
          --sublabel-text: #aaaaaa;
          --card-bg: #222222;
          --border: #333333;
          --button-bg: #ffffff;
          --button-text: #111111;
          --banner-bg: #1e293b;
          --banner-border: #475569;
          --banner-text: #e2e8f0;
        }

        :root[data-theme="warm"] {
          --bg: #fff8f1;
          --text: #442000;
          --sublabel-text: #aa7755;
          --card-bg: #ffffff;
          --border: #e0c2a0;
          --button-bg: #c16626;
          --button-text: #ffffff;
          --banner-bg: #fef3c7;
          --banner-border: #fcd34d;
          --banner-text: #92400e;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: var(--font-sans);
          background: var(--bg);
          color: var(--text);
          line-height: 1.6;
          min-height: 100vh;
        }

        .loading, .not-found {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.1rem;
          color: var(--text);
        }

        .listing-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .creator-banner {
          background: var(--banner-bg);
          border: 1px solid var(--banner-border);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 2rem;
        }

        .banner-content {
          text-align: center;
        }

        .banner-content h3 {
          color: var(--banner-text);
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .banner-content p {
          color: var(--banner-text);
          font-size: 0.9rem;
          margin-bottom: 1rem;
          opacity: 0.8;
        }

        .setup-button {
          background: var(--button-bg);
          color: var(--button-text);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .listing-content {
          background: var(--card-bg);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .product-image {
          width: 100%;
          height: 300px;
          object-fit: cover;
          display: block;
        }

        .product-details {
          padding: 2rem;
        }

        .product-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text);
        }

        .product-price {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 1rem;
        }

        .product-story {
          margin-bottom: 2rem;
          padding: 1rem;
          background: var(--bg);
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .product-story p {
          color: var(--sublabel-text);
          line-height: 1.6;
        }

        .product-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .info-section h3 {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text);
        }

        .info-section p {
          font-size: 0.85rem;
          color: var(--sublabel-text);
        }

        .buy-button {
          width: 100%;
          background: var(--button-bg);
          color: var(--button-text);
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 1rem;
          transition: transform 0.2s ease;
        }

        .buy-button:hover {
          transform: translateY(-1px);
        }

        .unavailable {
          text-align: center;
          padding: 1rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .unavailable p {
          color: var(--sublabel-text);
          font-size: 0.9rem;
        }

        .powered-by {
          text-align: center;
          font-size: 0.75rem;
          color: var(--sublabel-text);
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .listing-container {
            padding: 1rem;
          }
          
          .product-details {
            padding: 1.5rem;
          }

          .product-info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}