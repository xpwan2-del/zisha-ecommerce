import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  images: {
    type: [String],
    required: true
  },
  video: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  features: {
    type: [String],
    required: true
  },
  specifications: {
    type: {
      weight: String,
      size: String,
      material: String,
      capacity: String,
      color: [String],
      other: String
    },
    default: {}
  },
  shipping: {
    type: {
      freeShipping: {
        type: Boolean,
        default: false
      },
      shippingFee: {
        type: Number,
        default: 0
      },
      shippingTime: String,
      shippingRegions: [String]
    },
    default: {}
  },
  afterSale: {
    type: {
      returnPolicy: String,
      refundPolicy: String,
      warranty: String
    },
    default: {}
  },
  isLimited: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
