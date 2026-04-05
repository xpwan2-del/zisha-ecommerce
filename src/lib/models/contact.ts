import { Schema, model, Document } from 'mongoose';

export interface ContactDocument extends Document {
  title: string;
  description: string;
  images: string[];
  videoUrl: string;
  address: string;
  email: string;
  phone: string;
  openingHours: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<ContactDocument>({
  title: {
    type: String,
    required: true,
    default: 'Contact Us'
  },
  description: {
    type: String,
    required: true,
    default: 'Get in touch with us for any inquiries'
  },
  images: {
    type: [String],
    default: [
      'https://image.pollinations.ai/prompt/tea%20shop%20interior%20design?width=400&height=300&seed=contact1',
      'https://image.pollinations.ai/prompt/chinese%20tea%20ceremony%20setup?width=400&height=300&seed=contact2',
      'https://image.pollinations.ai/prompt/zisha%20pottery%20workshop?width=400&height=300&seed=contact3'
    ]
  },
  videoUrl: {
    type: String,
    default: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  address: {
    type: String,
    required: true,
    default: '123 Zisha Street, Yixing, Jiangsu, China'
  },
  email: {
    type: String,
    required: true,
    default: 'info@zishapottery.com'
  },
  phone: {
    type: String,
    required: true,
    default: '+86 123 4567 8910'
  },
  openingHours: {
    type: String,
    required: true,
    default: 'Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed'
  }
}, {
  timestamps: true
});

export const Contact = model<ContactDocument>('Contact', contactSchema);
