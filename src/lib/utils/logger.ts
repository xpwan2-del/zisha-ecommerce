// Simple logger utility
export function logInfo(message: string, ...args: any[]) {
  console.log('INFO:', message, ...args);
}

export function logError(message: string, ...args: any[]) {
  console.error('ERROR:', message, ...args);
}

export function logDebug(message: string, ...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.debug('DEBUG:', message, ...args);
  }
}
