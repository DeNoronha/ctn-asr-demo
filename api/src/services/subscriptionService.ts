import { Pool } from 'pg';

export interface Subscription {
  subscription_id: string;
  legal_entity_id: string;
  plan_name: string;
  plan_description?: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trial';
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  cancelled_at?: string;
  auto_renew: boolean;
  next_billing_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  notes?: string;
  metadata?: any;
}

export interface CreateSubscriptionInput {
  legal_entity_id: string;
  plan_name: string;
  plan_description?: string;
  price: number;
  currency?: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  trial_period_days?: number;
  start_date?: string;
  auto_renew?: boolean;
  created_by?: string;
  notes?: string;
}

export interface UpdateSubscriptionInput {
  plan_name?: string;
  plan_description?: string;
  price?: number;
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly';
  status?: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trial';
  auto_renew?: boolean;
  updated_by?: string;
  notes?: string;
}

export interface Invoice {
  invoice_id: string;
  subscription_id: string;
  legal_entity_id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issue_date: string;
  due_date: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  line_items?: any[];
}

export class SubscriptionService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all subscriptions
   */
  async getAllSubscriptions(filters?: {
    status?: string;
    legal_entity_id?: string;
  }): Promise<Subscription[]> {
    let query = `
      SELECT
        s.*,
        le.legal_name,
        le.org_id,
        le.domain
      FROM subscriptions s
      JOIN legal_entity le ON s.legal_entity_id = le.legal_entity_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.legal_entity_id) {
      query += ` AND s.legal_entity_id = $${paramIndex}`;
      params.push(filters.legal_entity_id);
      paramIndex++;
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `SELECT
        s.*,
        le.legal_name,
        le.org_id
      FROM subscriptions s
      JOIN legal_entity le ON s.legal_entity_id = le.legal_entity_id
      WHERE s.subscription_id = $1`,
      [subscriptionId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get subscriptions by legal entity
   */
  async getSubscriptionsByEntity(legalEntityId: string): Promise<Subscription[]> {
    const result = await this.pool.query(
      `SELECT * FROM subscriptions
       WHERE legal_entity_id = $1
       ORDER BY created_at DESC`,
      [legalEntityId]
    );

    return result.rows;
  }

  /**
   * Create new subscription
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate dates
      const startDate = input.start_date || new Date().toISOString();
      const trialEndDate = input.trial_period_days
        ? new Date(Date.now() + input.trial_period_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Calculate next billing date based on billing cycle
      const nextBillingDate = this.calculateNextBillingDate(
        startDate,
        input.billing_cycle,
        input.trial_period_days
      );

      // Insert subscription
      const result = await client.query(
        `INSERT INTO subscriptions (
          legal_entity_id,
          plan_name,
          plan_description,
          price,
          currency,
          billing_cycle,
          status,
          start_date,
          trial_end_date,
          auto_renew,
          next_billing_date,
          created_by,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          input.legal_entity_id,
          input.plan_name,
          input.plan_description,
          input.price,
          input.currency || 'EUR',
          input.billing_cycle,
          input.trial_period_days ? 'trial' : 'active',
          startDate,
          trialEndDate,
          input.auto_renew !== false,
          nextBillingDate,
          input.created_by,
          input.notes
        ]
      );

      const subscription = result.rows[0];

      // Log to subscription history
      await client.query(
        `INSERT INTO subscription_history (
          subscription_id,
          event_type,
          new_values,
          changed_by
        ) VALUES ($1, $2, $3, $4)`,
        [
          subscription.subscription_id,
          'created',
          JSON.stringify(subscription),
          input.created_by
        ]
      );

      await client.query('COMMIT');
      return subscription;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<Subscription> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current subscription
      const current = await this.getSubscriptionById(subscriptionId);
      if (!current) {
        throw new Error('Subscription not found');
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (input.plan_name !== undefined) {
        updates.push(`plan_name = $${paramIndex++}`);
        params.push(input.plan_name);
      }
      if (input.plan_description !== undefined) {
        updates.push(`plan_description = $${paramIndex++}`);
        params.push(input.plan_description);
      }
      if (input.price !== undefined) {
        updates.push(`price = $${paramIndex++}`);
        params.push(input.price);
      }
      if (input.billing_cycle !== undefined) {
        updates.push(`billing_cycle = $${paramIndex++}`);
        params.push(input.billing_cycle);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(input.status);

        // If cancelling, set cancelled_at
        if (input.status === 'cancelled') {
          updates.push(`cancelled_at = NOW()`);
        }
      }
      if (input.auto_renew !== undefined) {
        updates.push(`auto_renew = $${paramIndex++}`);
        params.push(input.auto_renew);
      }
      if (input.updated_by !== undefined) {
        updates.push(`updated_by = $${paramIndex++}`);
        params.push(input.updated_by);
      }
      if (input.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(input.notes);
      }

      if (updates.length === 0) {
        return current;
      }

      params.push(subscriptionId);
      const result = await client.query(
        `UPDATE subscriptions
         SET ${updates.join(', ')}
         WHERE subscription_id = $${paramIndex}
         RETURNING *`,
        params
      );

      const updated = result.rows[0];

      // Log to subscription history
      await client.query(
        `INSERT INTO subscription_history (
          subscription_id,
          event_type,
          old_values,
          new_values,
          changed_by
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          subscriptionId,
          'updated',
          JSON.stringify(current),
          JSON.stringify(updated),
          input.updated_by
        ]
      );

      await client.query('COMMIT');
      return updated;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelledBy?: string,
    reason?: string
  ): Promise<Subscription> {
    return this.updateSubscription(subscriptionId, {
      status: 'cancelled',
      updated_by: cancelledBy,
      notes: reason
    });
  }

  /**
   * Get upcoming renewals
   */
  async getUpcomingRenewals(daysAhead: number = 30): Promise<Subscription[]> {
    const result = await this.pool.query(
      `SELECT
        s.*,
        le.legal_name,
        le.org_id,
        le.primary_contact_email
      FROM subscriptions s
      JOIN legal_entity le ON s.legal_entity_id = le.legal_entity_id
      WHERE s.status = 'active'
        AND s.auto_renew = true
        AND s.next_billing_date IS NOT NULL
        AND s.next_billing_date <= NOW() + INTERVAL '${daysAhead} days'
      ORDER BY s.next_billing_date ASC`
    );

    return result.rows;
  }

  /**
   * Calculate next billing date
   */
  private calculateNextBillingDate(
    startDate: string,
    billingCycle: 'monthly' | 'quarterly' | 'yearly',
    trialPeriodDays?: number
  ): string {
    const start = new Date(startDate);

    // If trial period, add trial days first
    if (trialPeriodDays) {
      start.setDate(start.getDate() + trialPeriodDays);
    }

    // Add billing cycle
    switch (billingCycle) {
      case 'monthly':
        start.setMonth(start.getMonth() + 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() + 3);
        break;
      case 'yearly':
        start.setFullYear(start.getFullYear() + 1);
        break;
    }

    return start.toISOString();
  }

  /**
   * Generate invoice for subscription
   */
  async generateInvoice(subscriptionId: string): Promise<Invoice> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Generate unique invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate dates
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14); // Due in 14 days

    // Calculate tax (21% VAT for Netherlands)
    const amount = subscription.price;
    const taxAmount = amount * 0.21;
    const totalAmount = amount + taxAmount;

    const result = await this.pool.query(
      `INSERT INTO invoices (
        subscription_id,
        legal_entity_id,
        invoice_number,
        amount,
        tax_amount,
        total_amount,
        currency,
        status,
        issue_date,
        due_date,
        line_items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        subscriptionId,
        subscription.legal_entity_id,
        invoiceNumber,
        amount,
        taxAmount,
        totalAmount,
        subscription.currency,
        'draft',
        issueDate,
        dueDate,
        JSON.stringify([{
          description: `${subscription.plan_name} - ${subscription.billing_cycle} subscription`,
          quantity: 1,
          unit_price: amount,
          total: amount
        }])
      ]
    );

    return result.rows[0];
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const result = await this.pool.query(
      `SELECT invoice_number FROM invoices
       WHERE invoice_number LIKE $1
       ORDER BY invoice_number DESC
       LIMIT 1`,
      [`${prefix}%`]
    );

    if (result.rows.length === 0) {
      return `${prefix}0001`;
    }

    const lastNumber = parseInt(result.rows[0].invoice_number.split('-')[2]);
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
    return `${prefix}${nextNumber}`;
  }

  /**
   * Get invoices by subscription
   */
  async getInvoicesBySubscription(subscriptionId: string): Promise<Invoice[]> {
    const result = await this.pool.query(
      `SELECT * FROM invoices
       WHERE subscription_id = $1
       ORDER BY issue_date DESC`,
      [subscriptionId]
    );

    return result.rows;
  }

  /**
   * Get invoices by legal entity
   */
  async getInvoicesByEntity(legalEntityId: string): Promise<Invoice[]> {
    const result = await this.pool.query(
      `SELECT
        i.*,
        s.plan_name,
        s.billing_cycle
      FROM invoices i
      JOIN subscriptions s ON i.subscription_id = s.subscription_id
      WHERE i.legal_entity_id = $1
      ORDER BY i.issue_date DESC`,
      [legalEntityId]
    );

    return result.rows;
  }
}
