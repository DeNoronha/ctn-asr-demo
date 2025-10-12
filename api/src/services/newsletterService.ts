import { Pool } from 'pg';

export interface Newsletter {
  newsletter_id: string;
  title: string;
  subject_line: string;
  preview_text?: string;
  content: string;
  html_content: string;
  recipient_filter: 'all' | 'by_level' | 'by_status' | 'custom';
  membership_levels?: string[];
  entity_statuses?: string[];
  custom_recipient_ids?: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  unsubscribe_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  tags?: string[];
  metadata?: any;
}

export interface CreateNewsletterInput {
  title: string;
  subject_line: string;
  preview_text?: string;
  content: string;
  html_content: string;
  recipient_filter?: 'all' | 'by_level' | 'by_status' | 'custom';
  membership_levels?: string[];
  entity_statuses?: string[];
  custom_recipient_ids?: string[];
  scheduled_at?: string;
  created_by?: string;
  tags?: string[];
}

export interface UpdateNewsletterInput {
  title?: string;
  subject_line?: string;
  preview_text?: string;
  content?: string;
  html_content?: string;
  recipient_filter?: 'all' | 'by_level' | 'by_status' | 'custom';
  membership_levels?: string[];
  entity_statuses?: string[];
  custom_recipient_ids?: string[];
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  scheduled_at?: string;
  updated_by?: string;
  tags?: string[];
}

export interface NewsletterRecipient {
  recipient_id: string;
  newsletter_id: string;
  legal_entity_id: string;
  email_address: string;
  company_name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  open_count: number;
  click_count: number;
  last_opened_at?: string;
  last_clicked_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export class NewsletterService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all newsletters
   */
  async getAllNewsletters(filters?: {
    status?: string;
    limit?: number;
  }): Promise<Newsletter[]> {
    let query = `
      SELECT * FROM newsletters
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get newsletter by ID
   */
  async getNewsletterById(newsletterId: string): Promise<Newsletter | null> {
    const result = await this.pool.query(
      `SELECT * FROM newsletters WHERE newsletter_id = $1`,
      [newsletterId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create newsletter
   */
  async createNewsletter(input: CreateNewsletterInput): Promise<Newsletter> {
    const result = await this.pool.query(
      `INSERT INTO newsletters (
        title,
        subject_line,
        preview_text,
        content,
        html_content,
        recipient_filter,
        membership_levels,
        entity_statuses,
        custom_recipient_ids,
        status,
        scheduled_at,
        created_by,
        tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        input.title,
        input.subject_line,
        input.preview_text,
        input.content,
        input.html_content,
        input.recipient_filter || 'all',
        input.membership_levels || null,
        input.entity_statuses || null,
        input.custom_recipient_ids || null,
        input.scheduled_at ? 'scheduled' : 'draft',
        input.scheduled_at || null,
        input.created_by,
        input.tags || null
      ]
    );

    return result.rows[0];
  }

  /**
   * Update newsletter
   */
  async updateNewsletter(
    newsletterId: string,
    input: UpdateNewsletterInput
  ): Promise<Newsletter> {
    const current = await this.getNewsletterById(newsletterId);
    if (!current) {
      throw new Error('Newsletter not found');
    }

    // Can't update sent newsletters
    if (current.status === 'sent' || current.status === 'sending') {
      throw new Error('Cannot update newsletter that is already sent or sending');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(input.title);
    }
    if (input.subject_line !== undefined) {
      updates.push(`subject_line = $${paramIndex++}`);
      params.push(input.subject_line);
    }
    if (input.preview_text !== undefined) {
      updates.push(`preview_text = $${paramIndex++}`);
      params.push(input.preview_text);
    }
    if (input.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(input.content);
    }
    if (input.html_content !== undefined) {
      updates.push(`html_content = $${paramIndex++}`);
      params.push(input.html_content);
    }
    if (input.recipient_filter !== undefined) {
      updates.push(`recipient_filter = $${paramIndex++}`);
      params.push(input.recipient_filter);
    }
    if (input.membership_levels !== undefined) {
      updates.push(`membership_levels = $${paramIndex++}`);
      params.push(input.membership_levels);
    }
    if (input.entity_statuses !== undefined) {
      updates.push(`entity_statuses = $${paramIndex++}`);
      params.push(input.entity_statuses);
    }
    if (input.custom_recipient_ids !== undefined) {
      updates.push(`custom_recipient_ids = $${paramIndex++}`);
      params.push(input.custom_recipient_ids);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);
    }
    if (input.scheduled_at !== undefined) {
      updates.push(`scheduled_at = $${paramIndex++}`);
      params.push(input.scheduled_at);
    }
    if (input.updated_by !== undefined) {
      updates.push(`updated_by = $${paramIndex++}`);
      params.push(input.updated_by);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(input.tags);
    }

    if (updates.length === 0) {
      return current;
    }

    params.push(newsletterId);
    const result = await this.pool.query(
      `UPDATE newsletters
       SET ${updates.join(', ')}
       WHERE newsletter_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  /**
   * Delete newsletter
   */
  async deleteNewsletter(newsletterId: string): Promise<void> {
    const newsletter = await this.getNewsletterById(newsletterId);
    if (!newsletter) {
      throw new Error('Newsletter not found');
    }

    // Can't delete sent newsletters
    if (newsletter.status === 'sent') {
      throw new Error('Cannot delete sent newsletter');
    }

    await this.pool.query(
      `DELETE FROM newsletters WHERE newsletter_id = $1`,
      [newsletterId]
    );
  }

  /**
   * Get recipient list for newsletter
   */
  async getRecipientList(newsletterId: string): Promise<{ email: string; name: string; entity_id: string }[]> {
    const newsletter = await this.getNewsletterById(newsletterId);
    if (!newsletter) {
      throw new Error('Newsletter not found');
    }

    let query = `
      SELECT
        legal_entity_id as entity_id,
        primary_contact_email as email,
        legal_name as name
      FROM legal_entity
      WHERE 1=1
        AND primary_contact_email IS NOT NULL
        AND primary_contact_email != ''
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters based on recipient_filter
    switch (newsletter.recipient_filter) {
      case 'by_level':
        if (newsletter.membership_levels && newsletter.membership_levels.length > 0) {
          query += ` AND membership_level = ANY($${paramIndex})`;
          params.push(newsletter.membership_levels);
          paramIndex++;
        }
        break;

      case 'by_status':
        if (newsletter.entity_statuses && newsletter.entity_statuses.length > 0) {
          query += ` AND status = ANY($${paramIndex})`;
          params.push(newsletter.entity_statuses);
          paramIndex++;
        }
        break;

      case 'custom':
        if (newsletter.custom_recipient_ids && newsletter.custom_recipient_ids.length > 0) {
          query += ` AND legal_entity_id = ANY($${paramIndex})`;
          params.push(newsletter.custom_recipient_ids);
          paramIndex++;
        }
        break;

      case 'all':
      default:
        // No additional filters
        break;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Prepare newsletter for sending (create recipient records)
   */
  async prepareForSending(newsletterId: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get recipient list
      const recipients = await this.getRecipientList(newsletterId);

      if (recipients.length === 0) {
        throw new Error('No recipients found for this newsletter');
      }

      // Create recipient records
      for (const recipient of recipients) {
        await client.query(
          `INSERT INTO newsletter_recipients (
            newsletter_id,
            legal_entity_id,
            email_address,
            company_name,
            status
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING`,
          [
            newsletterId,
            recipient.entity_id,
            recipient.email,
            recipient.name,
            'pending'
          ]
        );
      }

      // Update newsletter with recipient count and status
      await client.query(
        `UPDATE newsletters
         SET recipient_count = $1,
             status = 'sending'
         WHERE newsletter_id = $2`,
        [recipients.length, newsletterId]
      );

      await client.query('COMMIT');
      return recipients.length;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark newsletter as sent
   */
  async markAsSent(newsletterId: string): Promise<Newsletter> {
    const result = await this.pool.query(
      `UPDATE newsletters
       SET status = 'sent',
           sent_at = NOW()
       WHERE newsletter_id = $1
       RETURNING *`,
      [newsletterId]
    );

    return result.rows[0];
  }

  /**
   * Get newsletter recipients
   */
  async getNewsletterRecipients(newsletterId: string): Promise<NewsletterRecipient[]> {
    const result = await this.pool.query(
      `SELECT * FROM newsletter_recipients
       WHERE newsletter_id = $1
       ORDER BY created_at ASC`,
      [newsletterId]
    );

    return result.rows;
  }

  /**
   * Update recipient delivery status
   */
  async updateRecipientStatus(
    recipientId: string,
    status: NewsletterRecipient['status'],
    errorMessage?: string
  ): Promise<void> {
    const updates: string[] = [`status = $1`];
    const params: any[] = [status];
    let paramIndex = 2;

    // Set timestamp based on status
    switch (status) {
      case 'sent':
        updates.push(`sent_at = NOW()`);
        break;
      case 'delivered':
        updates.push(`delivered_at = NOW()`);
        break;
      case 'opened':
        updates.push(`opened_at = COALESCE(opened_at, NOW())`);
        updates.push(`open_count = open_count + 1`);
        updates.push(`last_opened_at = NOW()`);
        break;
      case 'clicked':
        updates.push(`clicked_at = COALESCE(clicked_at, NOW())`);
        updates.push(`click_count = click_count + 1`);
        updates.push(`last_clicked_at = NOW()`);
        break;
      case 'bounced':
        updates.push(`bounced_at = NOW()`);
        break;
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramIndex++}`);
      params.push(errorMessage);
    }

    params.push(recipientId);

    await this.pool.query(
      `UPDATE newsletter_recipients
       SET ${updates.join(', ')}
       WHERE recipient_id = $${paramIndex}`,
      params
    );
  }

  /**
   * Get newsletter performance stats
   */
  async getNewsletterStats(newsletterId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM newsletter_performance_view
       WHERE newsletter_id = $1`,
      [newsletterId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all newsletter stats (dashboard)
   */
  async getAllNewsletterStats(): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM newsletter_performance_view
       ORDER BY sent_at DESC
       LIMIT 50`
    );

    return result.rows;
  }
}
