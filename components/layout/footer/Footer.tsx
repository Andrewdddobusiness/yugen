import { Twitter, Instagram, Facebook, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ink-900 text-white">
      <div className="absolute inset-0 route-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 noise-soft pointer-events-none" />

      <div className="container mx-auto px-4 py-14 mt-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Company Info */}
          <div className="flex flex-col items-start space-y-4">
            <Link href="/" className="flex flex-row items-center gap-3">
              <div className="w-[40px] h-[40px] group cursor-pointer select-none">
                <Image
                  className="w-full h-full transition-transform duration-500 ease-in-out transform group-hover:rotate-6"
                  src="/assets/yugi-mascot-1.png"
                  alt="Yugi Logo"
                  width={100}
                  height={100}
                  priority
                  draggable={false}
                />
              </div>
              <div>
                <h3 className="text-2xl font-semibold leading-tight font-logo">Yugi</h3>
                <p className="text-white/70 text-sm">Soft navigator for calm, confident travel planning.</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-2 text-sm">
              <MapPin className="h-4 w-4 text-amber-300" />
              <span className="text-white/80">Guiding travelers worldwide</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Explore</h3>
            <ul className="space-y-2 text-white/80">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Stay in touch</h3>
            <ul className="space-y-3 text-white/80">
              <li>
                <a href="mailto:support@yugi.app" className="hover:text-white transition-colors">
                  support@yugi.app
                </a>
              </li>
              <li className="flex space-x-4 pt-2">
                <a href="#" className="text-white/80 hover:text-white transition-colors">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">
                  <Facebook className="h-6 w-6" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/15 mt-10 text-white/70 pt-6">
          <p className="text-sm">&copy; {new Date().getFullYear()} Yugi. All rights reserved.</p>
          <p className="text-sm mt-3 sm:mt-0">Built for planners who like clarity, warmth, and gentle guidance.</p>
        </div>
      </div>
    </footer>
  );
}
