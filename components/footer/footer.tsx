import { Twitter } from "lucide-react";

import { Instagram } from "lucide-react";

import { Facebook } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative w-full bg-[#032bc0] text-white">
      {/* Noise texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          className="absolute w-full h-full opacity-[0.3] mix-blend-overlay"
        >
          <image href="/home/noise.svg" width="100%" height="100%" />
        </svg>
      </div>

      {/* Footer content */}
      <div className="container mx-auto px-4 py-12 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="flex flex-col items-start">
            <Link href="/" className="flex flex-row items-center gap-1">
              <div className="hidden sm:block w-[35px] h-[35px] group cursor-pointer select-none">
                <Image
                  className="w-full h-full transition-transform duration-500 ease-in-out transform group-hover:rotate-45 t"
                  src="/journey1.svg"
                  alt="Journey Logo"
                  width={100}
                  height={100}
                  priority
                  draggable={false}
                />
              </div>
              <h3 className="text-2xl font-semibold">Journey</h3>
            </Link>
            <p className="text-white/80">Your ultimate travel companion for creating perfect itineraries.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-white/80 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/80 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/80 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/80 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="text-white/80">
                <a href="mailto:support@journey.com" className="hover:text-white transition-colors">
                  support@journey.com
                </a>
              </li>
              <li className="flex space-x-4 pt-4">
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

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/10 mt-8 text-white/60 pt-8">
          <p className="hidden sm:block text-sm">&copy; {new Date().getFullYear()} Journey. All rights reserved.</p>
          <div className="flex justify-center w-full sm:w-[200px] h-[35px] group cursor-pointer select-none">
            <Image
              className="w-full h-full transition-transform duration-500 ease-in-out transform group-hover:rotate-12 invert brightness-0"
              src="/theTravelCompanyLogo.svg"
              alt="The Travel Company Logo"
              width={100}
              height={100}
              priority
              draggable={false}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
