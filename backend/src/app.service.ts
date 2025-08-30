import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Facebook Page Chatbot Backend API';
  }

  getHealth(): object {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Facebook Page Chatbot Backend',
      version: '1.0.0',
    };
  }
}
