import { supabase } from './db';
import { DatabaseError } from './db';
import { EnhancedRelease, ReleaseStatus, ReleaseMethod } from './schemas';

// Notification Types
export enum NotificationType {
  STOCK_UPDATE = 'stock_update',
  PRICE_CHANGE = 'price_change',
  STATUS_CHANGE = 'status_change',
  RAFFLE_UPDATE = 'raffle_update',
  RESTOCK_ALERT = 'restock_alert',
  RELEASE_REMINDER = 'release_reminder',
  PRICE_DROP = 'price_drop',
  HIGH_DEMAND = 'high_demand',
  BOT_ACTIVITY = 'bot_activity',
  REGION_AVAILABILITY = 'region_availability'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationRule {
  type: NotificationType;
  conditions: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: any;
  }[];
  priority: NotificationPriority;
  throttle?: number; // Minimum time between notifications in seconds
}

export interface NotificationPreferences {
  userId: string;
  rules: NotificationRule[];
  channels: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    webhook?: string;
  };
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
}

interface NotificationPayload {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data: any;
  timestamp: Date;
}

// Notification System
export class NotificationSystem {
  private static instance: NotificationSystem;
  private userPreferences: Map<string, NotificationPreferences> = new Map();
  private notificationHistory: Map<string, Date[]> = new Map();

  private constructor() {
    this.initializeRealTimeListeners();
  }

  public static getInstance(): NotificationSystem {
    if (!NotificationSystem.instance) {
      NotificationSystem.instance = new NotificationSystem();
    }
    return NotificationSystem.instance;
  }

  private initializeRealTimeListeners(): void {
    // Listen for release updates
    supabase
      .channel('release-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'releases'
        },
        this.handleReleaseChange.bind(this)
      )
      .subscribe();

    // Listen for stock updates
    supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock'
        },
        this.handleStockChange.bind(this)
      )
      .subscribe();
  }

  public async setUserPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: preferences.userId,
          preferences: preferences
        });
      
      this.userPreferences.set(preferences.userId, preferences);
    } catch (error) {
      throw new DatabaseError('Failed to set user preferences', error);
    }
  }

  public async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.preferences || null;
    } catch (error) {
      throw new DatabaseError('Failed to get user preferences', error);
    }
  }

  private async handleReleaseChange(payload: any): Promise<void> {
    const release = payload.new as EnhancedRelease;
    const oldRelease = payload.old as EnhancedRelease;

    // Check for status changes
    if (oldRelease?.status !== release.status) {
      await this.processStatusChange(release, oldRelease?.status);
    }

    // Check for price changes
    if (oldRelease?.retailPrice !== release.retailPrice) {
      await this.processPriceChange(release, oldRelease?.retailPrice);
    }

    // Check for raffle updates
    if (release.releaseMethod === 'raffle' && release.raffleDetails) {
      await this.processRaffleUpdate(release);
    }
  }

  private async handleStockChange(payload: any): Promise<void> {
    const stockUpdate = payload.new;
    const oldStock = payload.old;

    if (stockUpdate.quantity > 0 && oldStock?.quantity === 0) {
      await this.processRestockAlert(stockUpdate);
    }

    await this.processStockUpdate(stockUpdate, oldStock);
  }

  private async processStatusChange(
    release: EnhancedRelease,
    oldStatus?: ReleaseStatus
  ): Promise<void> {
    const notification: NotificationPayload = {
      type: NotificationType.STATUS_CHANGE,
      priority: this.determineStatusChangePriority(release.status),
      title: `Status Update: ${release.name}`,
      message: `Release status changed from ${oldStatus || 'unknown'} to ${release.status}`,
      data: { releaseId: release.id, oldStatus, newStatus: release.status },
      timestamp: new Date()
    };

    await this.dispatchNotifications(notification);
  }

  private async processPriceChange(
    release: EnhancedRelease,
    oldPrice?: number
  ): Promise<void> {
    if (!oldPrice) return;

    const priceChange = ((release.retailPrice - oldPrice) / oldPrice) * 100;
    const notification: NotificationPayload = {
      type: NotificationType.PRICE_CHANGE,
      priority: Math.abs(priceChange) > 20 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      title: `Price Update: ${release.name}`,
      message: `Price ${priceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(priceChange).toFixed(1)}%`,
      data: { releaseId: release.id, oldPrice, newPrice: release.retailPrice, priceChange },
      timestamp: new Date()
    };

    await this.dispatchNotifications(notification);
  }

  private async processRaffleUpdate(release: EnhancedRelease): Promise<void> {
    if (!release.raffleDetails) return;

    const now = new Date();
    const raffleEnd = new Date(release.raffleDetails.endTime);
    const timeLeft = raffleEnd.getTime() - now.getTime();

    if (timeLeft > 0 && timeLeft < 3600000) { // Less than 1 hour left
      const notification: NotificationPayload = {
        type: NotificationType.RAFFLE_UPDATE,
        priority: NotificationPriority.URGENT,
        title: `Raffle Ending Soon: ${release.name}`,
        message: `Only ${Math.ceil(timeLeft / 60000)} minutes left to enter!`,
        data: { releaseId: release.id, raffleDetails: release.raffleDetails },
        timestamp: new Date()
      };

      await this.dispatchNotifications(notification);
    }
  }

  private async processRestockAlert(stockUpdate: any): Promise<void> {
    const notification: NotificationPayload = {
      type: NotificationType.RESTOCK_ALERT,
      priority: NotificationPriority.HIGH,
      title: 'Restock Alert',
      message: `Size ${stockUpdate.size} now available!`,
      data: stockUpdate,
      timestamp: new Date()
    };

    await this.dispatchNotifications(notification);
  }

  private async processStockUpdate(stockUpdate: any, oldStock: any): Promise<void> {
    if (!oldStock) return;

    const notification: NotificationPayload = {
      type: NotificationType.STOCK_UPDATE,
      priority: NotificationPriority.MEDIUM,
      title: 'Stock Update',
      message: `Stock level changed for size ${stockUpdate.size}`,
      data: { old: oldStock, new: stockUpdate },
      timestamp: new Date()
    };

    await this.dispatchNotifications(notification);
  }

  private determineStatusChangePriority(status: ReleaseStatus): NotificationPriority {
    const priorityMap: Record<ReleaseStatus, NotificationPriority> = {
      announced: NotificationPriority.MEDIUM,
      upcoming: NotificationPriority.MEDIUM,
      raffle_open: NotificationPriority.HIGH,
      raffle_closed: NotificationPriority.MEDIUM,
      released: NotificationPriority.HIGH,
      restock_soon: NotificationPriority.HIGH,
      restocked: NotificationPriority.URGENT,
      sold_out: NotificationPriority.MEDIUM,
      delayed: NotificationPriority.HIGH,
      cancelled: NotificationPriority.HIGH,
      region_locked: NotificationPriority.MEDIUM
    };

    return priorityMap[status] || NotificationPriority.MEDIUM;
  }

  private async dispatchNotifications(notification: NotificationPayload): Promise<void> {
    for (const [userId, preferences] of this.userPreferences.entries()) {
      if (this.shouldNotifyUser(userId, preferences, notification)) {
        await this.sendNotification(userId, preferences, notification);
      }
    }
  }

  private shouldNotifyUser(
    userId: string,
    preferences: NotificationPreferences,
    notification: NotificationPayload
  ): boolean {
    // Check quiet hours
    if (preferences.quietHours) {
      const now = new Date();
      const userTz = preferences.quietHours.timezone;
      const userTime = now.toLocaleTimeString('en-US', { timeZone: userTz, hour12: false });
      const [currentHour] = userTime.split(':');
      
      const [quietStart] = preferences.quietHours.start.split(':');
      const [quietEnd] = preferences.quietHours.end.split(':');
      
      const hour = parseInt(currentHour);
      const start = parseInt(quietStart);
      const end = parseInt(quietEnd);
      
      if (start < end) {
        if (hour >= start && hour < end) return false;
      } else {
        if (hour >= start || hour < end) return false;
      }
    }

    // Check notification rules
    const matchingRule = preferences.rules.find(rule => 
      rule.type === notification.type &&
      rule.conditions.every(condition => {
        const value = notification.data[condition.field];
        switch (condition.operator) {
          case 'eq': return value === condition.value;
          case 'neq': return value !== condition.value;
          case 'gt': return value > condition.value;
          case 'lt': return value < condition.value;
          case 'gte': return value >= condition.value;
          case 'lte': return value <= condition.value;
          case 'contains': return value?.includes(condition.value);
          default: return false;
        }
      })
    );

    if (!matchingRule) return false;

    // Check throttling
    if (matchingRule.throttle) {
      const history = this.notificationHistory.get(`${userId}:${notification.type}`) || [];
      const now = new Date();
      const recent = history.filter(date => 
        (now.getTime() - date.getTime()) / 1000 < matchingRule.throttle!
      );
      
      if (recent.length > 0) return false;
      
      // Update history
      history.push(now);
      this.notificationHistory.set(`${userId}:${notification.type}`, history);
    }

    return true;
  }

  private async sendNotification(
    userId: string,
    preferences: NotificationPreferences,
    notification: NotificationPayload
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    if (preferences.channels.email) {
      promises.push(this.sendEmail(userId, notification));
    }

    if (preferences.channels.push) {
      promises.push(this.sendPushNotification(userId, notification));
    }

    if (preferences.channels.sms) {
      promises.push(this.sendSMS(userId, notification));
    }

    if (preferences.channels.webhook) {
      promises.push(this.sendWebhook(preferences.channels.webhook, notification));
    }

    await Promise.all(promises);
  }

  private async sendEmail(userId: string, notification: NotificationPayload): Promise<void> {
    // Implement email sending logic
    console.log('Sending email notification:', { userId, notification });
  }

  private async sendPushNotification(userId: string, notification: NotificationPayload): Promise<void> {
    // Implement push notification logic
    console.log('Sending push notification:', { userId, notification });
  }

  private async sendSMS(userId: string, notification: NotificationPayload): Promise<void> {
    // Implement SMS sending logic
    console.log('Sending SMS notification:', { userId, notification });
  }

  private async sendWebhook(url: string, notification: NotificationPayload): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook delivery failed:', error);
    }
  }
}