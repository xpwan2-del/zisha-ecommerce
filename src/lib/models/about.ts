import { Schema, model, Document } from 'mongoose';

export interface AboutDocument extends Document {
  title: string;
  description: string;
  images: string[];
  videoUrl: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const aboutSchema = new Schema<AboutDocument>({
  title: {
    type: String,
    required: true,
    default: 'About Us'
  },
  description: {
    type: String,
    required: true,
    default: 'Learn about our zisha pottery craftsmanship'
  },
  images: {
    type: [String],
    default: [
      'https://image.pollinations.ai/prompt/zisha%20pottery%20craftsman%20working%20on%20teapot?width=400&height=300&seed=about1',
      'https://image.pollinations.ai/prompt/zisha%20teapots%20display%20in%20shop?width=400&height=300&seed=about2',
      'https://image.pollinations.ai/prompt/traditional%20chinese%20tea%20ceremony?width=400&height=300&seed=about3'
    ]
  },
  videoUrl: {
    type: String,
    default: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  content: {
    type: String,
    required: true,
    default: 'Our zisha pottery is handcrafted by skilled artisans using traditional techniques that have been passed down for generations. Each piece is unique and carries the essence of Chinese culture and craftsmanship.'
  }
}, {
  timestamps: true
});

export const About = model<AboutDocument>('About', aboutSchema);
