import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Performance } from "@/components/landing/Performance";
import { UnderTheHood } from "@/components/landing/UnderTheHood";
import { Features } from "@/components/landing/Features";
import { Ecosystem } from "@/components/landing/Ecosystem";
import { Deploy } from "@/components/landing/Deploy";
import { Playground } from "@/components/landing/Playground";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      
      <div className="flex flex-col">
        <Hero />
        <Performance />
        <UnderTheHood />
        <Features />
        <Ecosystem />
        <Deploy />
        <Playground />
      </div>
      
      <Footer />
    </main>
  );
}
