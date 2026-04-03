import { Schema, model, Document } from 'mongoose';

export interface PromotionDocument extends Document {
  title: string;
  description: string;
  image: string;
  discount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  products: string[];
  createdAt: Date;
  updatedAt: Date;
}

const promotionSchema = new Schema<PromotionDocument>({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, {
  timestamps: true,
});

export const Promotion = model<PromotionDocument>('Promotion', promotionSchema);
