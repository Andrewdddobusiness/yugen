import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const footerLinks = [
    { label: "T&Cs", href: "/" },
    { label: "Privacy", href: "/about" },
    { label: "Pricing", href: "/services" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer className="flex justify-center border-dashed border-t-2 border-black text-black">
      <div className="grid grid-cols-2 w-screen px-12 md:px-36 py-12">
        <div className="col-span-2 md:col-span-1 flex flex-col text-center md:text-left justify-center md:justify-start">
          <div className="flex flex-row justify-center md:justify-start">
            <Image
              src="/smile.svg"
              alt="smile"
              width={100}
              height={100}
              sizes="100vw"
              className="max-w-[35px]"
            />

            <div className="flex items-center font-Patua text-xl font-bold ml-2">
              <Link href={"/"}>yugen</Link>
            </div>
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Turn your next trip into a hassle-free experience <br /> with yugen.
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 flex justify-center md:justify-end">
          <nav className="flex flex-wrap mt-12 md:mt-3 justify-center md:justify-end">
            {footerLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-xs hover:text-gray-300 px-4"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="col-span-2 flex justify-center items-center text-xs mt-16 md:mt-8">
          © 2023 Yugen. All rights reserved
        </div>
      </div>
    </footer>
  );
}
