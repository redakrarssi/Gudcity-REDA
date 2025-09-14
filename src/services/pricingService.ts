import sql from '../utils/db';

export interface PricingFeature {
  id: string;
  name: string;
  included: boolean;
  limit?: number | null;
}

export interface PricingPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_period: 'monthly' | 'yearly';
  currency: string;
  features: PricingFeature[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Ensures the pricing_plans table exists */
export async function ensurePricingTableExists(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS pricing_plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL DEFAULT 0,
        billing_period TEXT NOT NULL DEFAULT 'monthly',
        currency TEXT NOT NULL DEFAULT 'USD',
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_popular BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
  } catch (error) {
    console.error('❌ Error ensuring pricing_plans table exists:', error);
    throw error;
  }
}

function formatPlan(row: any): PricingPlan {
  let parsedFeatures: PricingFeature[] = [];
  try {
    const raw = row.features;
    parsedFeatures = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
  } catch {
    parsedFeatures = [];
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price) || 0,
    billing_period: (row.billing_period === 'yearly' ? 'yearly' : 'monthly'),
    currency: row.currency || 'USD',
    features: parsedFeatures,
    is_popular: !!row.is_popular,
    is_active: !!row.is_active,
    sort_order: Number(row.sort_order) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function getAllPlans(): Promise<PricingPlan[]> {
  await ensurePricingTableExists();
  const rows = await sql`
    SELECT * FROM pricing_plans ORDER BY sort_order ASC, id ASC
  `;
  return rows.map(formatPlan);
}

export async function getActivePlans(): Promise<PricingPlan[]> {
  await ensurePricingTableExists();
  const rows = await sql`
    SELECT *
    FROM pricing_plans
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, id ASC
  `;
  return rows.map(formatPlan);
}

export async function createPlan(plan: Omit<PricingPlan, 'id' | 'created_at' | 'updated_at'>): Promise<PricingPlan> {
  await ensurePricingTableExists();
  const rows = await sql`
    INSERT INTO pricing_plans (
      name, description, price, billing_period, currency,
      features, is_popular, is_active, sort_order
    ) VALUES (
      ${plan.name}, ${plan.description}, ${plan.price}, ${plan.billing_period}, ${plan.currency},
      ${JSON.stringify(plan.features)}::jsonb, ${plan.is_popular}, ${plan.is_active}, ${plan.sort_order}
    ) RETURNING *
  `;
  return formatPlan(rows[0]);
}

export async function updatePlan(id: number, plan: Partial<Omit<PricingPlan, 'id' | 'created_at' | 'updated_at'>>): Promise<PricingPlan | null> {
  await ensurePricingTableExists();
  // Fetch existing
  const existingRows = await sql`SELECT * FROM pricing_plans WHERE id = ${id}`;
  if (existingRows.length === 0) return null;
  const existing = formatPlan(existingRows[0]);

  const name = plan.name ?? existing.name;
  const description = plan.description ?? existing.description;
  const price = plan.price ?? existing.price;
  const billing_period = plan.billing_period ?? existing.billing_period;
  const currency = plan.currency ?? existing.currency;
  const features = plan.features ?? existing.features;
  const is_popular = plan.is_popular ?? existing.is_popular;
  const is_active = plan.is_active ?? existing.is_active;
  const sort_order = plan.sort_order ?? existing.sort_order;

  const rows = await sql`
    UPDATE pricing_plans SET
      name = ${name},
      description = ${description},
      price = ${price},
      billing_period = ${billing_period},
      currency = ${currency},
      features = ${JSON.stringify(features)}::jsonb,
      is_popular = ${is_popular},
      is_active = ${is_active},
      sort_order = ${sort_order},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) return null;
  return formatPlan(rows[0]);
}

export async function deletePlan(id: number): Promise<boolean> {
  await ensurePricingTableExists();
  const rows = await sql`DELETE FROM pricing_plans WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

