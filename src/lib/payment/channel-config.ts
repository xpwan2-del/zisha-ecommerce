// src/lib/payment/channel-config.ts
import { ChannelConfig } from './types';

export const CHANNEL_CONFIGS: Record<string, ChannelConfig> = {
  paypal: {
    channel: 'paypal',
    amountUnit: 'main',
    supportsLineItems: true,
    responseType: 'redirect',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'AED', 'GBP', 'CNY'],
    requiresClientIp: false,
    requiresOpenid: false,
  },
  stripe: {
    channel: 'stripe',
    amountUnit: 'cents',
    supportsLineItems: true,
    responseType: 'redirect',
    defaultCurrency: 'usd',
    supportedCurrencies: ['usd', 'aed', 'eur', 'cny', 'gbp'],
    requiresClientIp: false,
    requiresOpenid: false,
  },
  alipay: {
    channel: 'alipay',
    amountUnit: 'main',
    supportsLineItems: false,
    responseType: 'redirect',
    defaultCurrency: 'CNY',
    supportedCurrencies: ['CNY'],
    requiresClientIp: false,
    requiresOpenid: false,
  },
  wechat: {
    channel: 'wechat',
    amountUnit: 'cents',
    supportsLineItems: false,
    responseType: 'sdk_params',
    defaultCurrency: 'CNY',
    supportedCurrencies: ['CNY'],
    requiresClientIp: true,
    requiresOpenid: true,
  },
};

export function getChannelConfig(channel: string): ChannelConfig {
  const config = CHANNEL_CONFIGS[channel];
  if (!config) {
    throw new Error(`Unknown payment channel: ${channel}`);
  }
  return config;
}
