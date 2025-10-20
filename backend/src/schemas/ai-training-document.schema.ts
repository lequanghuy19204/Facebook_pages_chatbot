import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AITrainingDocumentDocument = AITrainingDocument & Document;

@Schema({ 
  collection: 'ai_training_documents',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})
export class AITrainingDocument {
  @Prop({ required: true, unique: true })
  document_id: string;

  @Prop({ required: true })
  company_id: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop()
  prompt?: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  created_by: string;

  @Prop()
  updated_by: string;

  @Prop()
  created_at: Date;

  @Prop()
  updated_at: Date;
}

export const AITrainingDocumentSchema = SchemaFactory.createForClass(AITrainingDocument);

// Create indexes
AITrainingDocumentSchema.index({ document_id: 1 }, { unique: true });
AITrainingDocumentSchema.index({ company_id: 1 });
AITrainingDocumentSchema.index({ company_id: 1, category: 1 });
AITrainingDocumentSchema.index({ question: 'text', answer: 'text' });
