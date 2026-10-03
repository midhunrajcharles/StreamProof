import { getLt } from "@/components/lt";
export default async function CookieBanner() {
  const lt = await getLt();
  return (
    <>
      <div data-cookie-banner="" className="fixed bottom-3 right-3 md:bottom-5 md:right-5 z-110 pointer-events-none translate-y-3 opacity-0 transition-[transform,opacity] duration-300 ease-out" hidden role="dialog" aria-label={lt("Cookie consent")} aria-describedby="cookie-banner-desc">
        <div className="pointer-events-auto flex items-center gap-12 bg-[#E0E0E0]/70 backdrop-blur-lg py-2 pl-3 pr-2 rounded-xs">
          <p id="cookie-banner-desc" className="text-sm leading-none whitespace-nowrap">
            {lt("No cookies. No tracking.")}
          </p>
          <div data-cookie-accept="" className="relative z-1 flex h-8 shrink-0 items-center">
            <a href="#" className="group relative overflow-visible font-sans leading-none inline-grid" style={{"color": "white"}} target="_self" data-astro-cid-ekguhzzh="">
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "maskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <div className="absolute inset-0 rounded transition-[inset] duration-600 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover:inset-[0.125em]" style={{"backgroundColor": "black"}} data-astro-cid-ekguhzzh="" />
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(0.65px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "maskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <div className="absolute inset-0 rounded transition-[inset] duration-600 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover:inset-[0.125em]" style={{"backgroundColor": "black"}} data-astro-cid-ekguhzzh="" />
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(2px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "maskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <div className="absolute inset-0 rounded transition-[inset] duration-600 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover:inset-[0.125em]" style={{"backgroundColor": "black"}} data-astro-cid-ekguhzzh="" />
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "maskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <span data-button-animate-chars="" className="relative z-1 inline-block overflow-hidden whitespace-nowrap text-base leading-[1.3] font-medium" style={{"color": "white"}} data-astro-cid-ekguhzzh="">
                    {lt("Got it")}
                  </span>
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(0.65px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "maskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <span data-button-animate-chars="" className="relative z-1 inline-block overflow-hidden whitespace-nowrap text-base leading-[1.3] font-medium" style={{"color": "white"}} data-astro-cid-ekguhzzh="">
                    {lt("Got it")}
                  </span>
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(2px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "maskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <span data-button-animate-chars="" className="relative z-1 inline-block overflow-hidden whitespace-nowrap text-base leading-[1.3] font-medium" style={{"color": "white"}} data-astro-cid-ekguhzzh="">
                    {lt("Got it")}
                  </span>
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
