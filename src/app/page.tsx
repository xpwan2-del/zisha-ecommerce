import { HomeModules } from '@/components/HomeModules';
import { Categories } from '@/components/Categories';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { About } from '@/components/About';
import { Testimonials } from '@/components/Testimonials';
import { Contact } from '@/components/Contact';

export default function Home() {
  return (
    <div className="min-h-screen text-[#450A0A]">
      <HomeModules />
      <Categories />
      <FeaturedProducts />
      <About />
      <Testimonials />
      <Contact />
    </div>
  );
}