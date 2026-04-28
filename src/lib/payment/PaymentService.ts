import { query } from '@/lib/db';
import { IPaymentDriver, PaymentConfig } from './IPaymentDriver';
import { PayPalDriver } from './drivers/PayPalDriver';
import { AlipayDriver } from './drivers/AlipayDriver';
import { StripeDriver } from './drivers/StripeDriver';

export class PaymentService {
  private static drivers: Map<string, IPaymentDriver> = new Map();
  private static configs: Map<string, PaymentConfig> = new Map();
  private static initialized: boolean = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const result = await query(
        'SELECT * FROM payment_config WHERE is_enabled = 1 ORDER BY sort_order'
      );

      for (const row of result.rows) {
        const config: PaymentConfig = {
          id: row.id as number,
          payment_method: row.payment_method as string,
          display_name: row.display_name as string,
          is_enabled: Boolean(row.is_enabled),
          is_sandbox: Boolean(row.is_sandbox),
          config_json: row.config_json as string,
          sort_order: row.sort_order as number
        };

        this.configs.set(config.payment_method, config);

        const driver = this.createDriver(config.payment_method, config);
        if (driver) {
          this.drivers.set(config.payment_method, driver);
        }
      }

      this.initialized = true;
      console.log('[PaymentService] Initialized with drivers:', Array.from(this.drivers.keys()));
    } catch (error) {
      console.error('[PaymentService] Initialize failed:', error);
    }
  }

  static getDriver(paymentMethod: string): IPaymentDriver | null {
    return this.drivers.get(paymentMethod) || null;
  }

  static getConfig(paymentMethod: string): PaymentConfig | null {
    return this.configs.get(paymentMethod) || null;
  }

  static isMethodEnabled(paymentMethod: string): boolean {
    return this.drivers.has(paymentMethod);
  }

  static async getAvailableMethods(): Promise<PaymentConfig[]> {
    try {
      const result = await query(
        'SELECT * FROM payment_config WHERE is_enabled = 1 ORDER BY sort_order'
      );

      return result.rows.map(row => ({
        id: row.id as number,
        payment_method: row.payment_method as string,
        display_name: row.display_name as string,
        is_enabled: Boolean(row.is_enabled),
        is_sandbox: Boolean(row.is_sandbox),
        config_json: row.config_json as string,
        sort_order: row.sort_order as number
      }));
    } catch (error) {
      console.error('[PaymentService] getAvailableMethods failed:', error);
      return [];
    }
  }

  static async reload(): Promise<void> {
    this.initialized = false;
    this.drivers.clear();
    this.configs.clear();
    await this.initialize();
  }

  private static createDriver(method: string, config: PaymentConfig): IPaymentDriver | null {
    try {
      switch (method) {
        case 'paypal':
          return new PayPalDriver(config);
        case 'alipay':
          return new AlipayDriver(config);
        case 'stripe':
          return new StripeDriver(config);
        default:
          console.warn(`[PaymentService] Unknown payment method: ${method}`);
          return null;
      }
    } catch (error) {
      console.error(`[PaymentService] Create driver failed for ${method}:`, error);
      return null;
    }
  }
}