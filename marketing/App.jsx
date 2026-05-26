import MeshBackground from "./components/MeshBackground.jsx";
import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Features from "./components/Features.jsx";
import Platforms from "./components/Platforms.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import Install from "./components/Install.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <div className="relative min-h-screen">
      <MeshBackground />
      <Nav />
      <main>
        <Hero />
        <Features />
        <Platforms />
        <HowItWorks />
        <Install />
      </main>
      <Footer />
    </div>
  );
}
