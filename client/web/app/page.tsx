// import { ContentWrapper } from "@/components/core/content-wrapper";
// import { ThemeTogglerButton } from "@/components/core/theme-toggler";
// import Link from "next/link";


import { Navbar } from "@/components/core/landing/navbar";
import { Hero } from "@/components/core/landing/hero";
import { Feature } from "@/components/core/landing/feature";
import { FAQ } from "@/components/core/landing/faq";
import { Contacts } from "@/components/core/landing/contacts";
import { Footer } from "@/components/core/landing/footer";
// import { LightRays } from "@/components/ui/light-rays";



export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-col w-full">
            <Navbar />
            <Hero />
            <Feature />
            <FAQ />
            <Contacts />
            <Footer />
            {/* <LightRays /> */}
      
          </div>
    </div>
  );
}

// export default function Page() {
//   return (
//     <ContentWrapper>
//       <div className="flex flex-col gap-6 pt-10">        
//         <h1>Welcome to the OpenTier AI</h1>
//         <p>OpenTier is a Rag with Scrapping Capabilities</p>
//         <Link href="/chat">Chat</Link>
//         <ThemeTogglerButton/>
//       </div>
//     </ContentWrapper>
//   );
// }