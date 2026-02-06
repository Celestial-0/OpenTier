import { Navbar } from "@/components/core/landing/navbar";
import { Hero } from "@/components/core/landing/hero";
import { Feature } from "@/components/core/landing/feature";
import { FAQ } from "@/components/core/landing/faq";
import { Contacts } from "@/components/core/landing/contacts";
import { Footer } from "@/components/core/landing/footer";
import { LightRays } from "@/components/ui/light-rays";



export const Landing = () => {
  return (
    <div className="flex flex-col w-full">
      <Navbar />
      <Hero />
      <Feature />
      <FAQ />
      <Contacts />
      <Footer />
      <LightRays />

    </div>
  );
};
