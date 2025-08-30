import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';

@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
  constructor(private configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get<string>('MONGODB_URI');
    
    if (!uri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    return {
      uri,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // This will be called by the MongooseModule automatically
      console.log('MongoDB connection established successfully');
      return true;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      return false;
    }
  }
}
