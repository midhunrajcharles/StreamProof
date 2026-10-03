import PageBackground from "@/components/chrome/PageBackground";
import Header from "@/components/chrome/Header";
import MobileMenu from "@/components/chrome/MobileMenu";
import Hero from "@/components/sections/Hero";
import Intro from "@/components/sections/Intro";
import Work from "@/components/sections/Work";
import Showcase from "@/components/sections/Showcase";
import Process from "@/components/sections/Process";
import Services from "@/components/sections/Services";
import Testimonials from "@/components/sections/Testimonials";
import About from "@/components/sections/About";
import Faq from "@/components/sections/Faq";
import Cta from "@/components/sections/Cta";
import Footer from "@/components/sections/Footer";
import CookieBanner from "@/components/chrome/CookieBanner";
import SiteScripts from "@/components/SiteScripts";

export default function Home() {
  return (
    <>
      <PageBackground />
      <Header />
      <MobileMenu />
      <Hero />
      <Intro />
      <Work />
      <Showcase />
      <Process />
      <Services />
      <Testimonials />
      <About />
      <Faq />
      <Cta />
      <Footer />
      <CookieBanner />
      <SiteScripts />
    </>
  );
}
