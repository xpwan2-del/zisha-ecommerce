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
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20pottery%20craftsman%20working%20on%20teapot&image_size=landscape_4_3',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapots%20display%20in%20shop&image_size=landscape_4_3',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20tea%20ceremony&image_size=landscape_4_3'
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
