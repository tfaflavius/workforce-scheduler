import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailNotificationRule } from '../../modules/permissions/entities/email-notification-rule.entity';

/**
 * Service to check if an email notification is allowed based on the
 * EmailNotificationRule configuration in the database.
 *
 * Usage: Before sending an email, call `isEmailAllowed(eventType, eventAction)`
 * to check if the rule is active. This allows admins to enable/disable
 * email notifications from the Permissions page.
 */
@Injectable()
export class EmailRuleCheckerService {
  constructor(
    @InjectRepository(EmailNotificationRule)
    private readonly ruleRepo: Repository<EmailNotificationRule>,
  ) {}

  /**
   * Check if an email notification is allowed for a given event type and action.
   * Returns true if at least one active rule matches, or if no rules exist for this event
   * (fallback to allowing for backwards compatibility).
   */
  async isEmailAllowed(eventType: string, eventAction: string): Promise<boolean> {
    const rules = await this.ruleRepo.find({
      where: { eventType, eventAction },
    });

    // If no rules exist for this event type + action, allow email (backwards compatible)
    if (rules.length === 0) {
      return true;
    }

    // If at least one rule is active, allow
    return rules.some(rule => rule.isActive);
  }

  /**
   * Get all active rules for a given event type and action.
   * Useful for determining WHO should receive the email.
   */
  async getActiveRules(eventType: string, eventAction: string): Promise<EmailNotificationRule[]> {
    return this.ruleRepo.find({
      where: { eventType, eventAction, isActive: true },
      relations: ['recipientDepartment'],
    });
  }

  /**
   * Get all active immediate rules for a given event type and action.
   */
  async getImmediateRules(eventType: string, eventAction: string): Promise<EmailNotificationRule[]> {
    return this.ruleRepo.find({
      where: { eventType, eventAction, isActive: true, sendImmediate: true },
      relations: ['recipientDepartment'],
    });
  }

  /**
   * Get all active scheduled (cron) rules.
   * Used by cron jobs to determine which reports to send.
   */
  async getScheduledRules(): Promise<EmailNotificationRule[]> {
    return this.ruleRepo.find({
      where: { isActive: true, sendImmediate: false },
      relations: ['recipientDepartment'],
    });
  }
}
