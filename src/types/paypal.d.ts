declare module '@paypal/checkout-server-sdk' {
  export class PayPalHttpClient {
    constructor(environment: any);
    execute(request: any): Promise<any>;
  }

  export namespace orders {
    namespace Environment {
      class Sandbox {
        constructor(clientId: string, clientSecret: string);
      }
      class Live {
        constructor(clientId: string, clientSecret: string);
      }
    }

    class OrdersCreateRequest {
      prefer(preference: string): this;
      requestBody(body: any): this;
    }

    class OrdersCaptureRequest {
      constructor(orderId: string);
      prefer(preference: string): this;
      requestBody(body: any): this;
    }
  }
}
