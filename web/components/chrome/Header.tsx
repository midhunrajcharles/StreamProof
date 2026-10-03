export default function Header() {
  return (
    <>
      <header data-header-entrance="" className="fixed top-0 left-0 right-0 z-50 page-x pt-3 pb-3 md:pt-3.5 md:pb-[0.938rem] mix-blend-difference font-mono leading-none text-white border-b border-white/10">
        <div className="flex justify-between md:grid grid-cols-4 md:grid-cols-12 gap-3 md:gap-5">
          <div className="md:col-span-4 lg:col-span-2 flex items-center">
            <a href="/" aria-label="StreamProof home">
              <svg className="h-3.5 w-auto" width="100%" height="100%" viewBox="0 0 613.75 69.92" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><text x="0" y="69.92" textLength="613.75" lengthAdjust="spacing" style={{"fontFamily": "var(--font-as-module)", "fontSize": "63.5px"}}>{"STREAMPROOF"}</text></svg>
            </a>
          </div>
          <div className="lg:col-start-4 lg:col-span-4 hidden items-center lg:flex uppercase">
            <span className="dot">
              {"(OneAquaHealth · IEEE 2026)"}
            </span>
          </div>
          <ul className="md:col-span-3 lg:col-start-8 lg:col-span-2 hidden md:flex items-center gap-4 uppercase">
            <li>
              <a href="/#work" className="group relative hidden md:inline-flex" data-nav-clip="">
                <span data-nav-label="">
                  {"Product"}
                </span>
                <span className="absolute inset-0 flex items-center bg-white text-black pointer-events-none whitespace-nowrap [clip-path:inset(0_100%_0_0)] group-data-[state=in]:[clip-path:inset(0_0_0_0)] group-data-[state=out]:[clip-path:inset(0_0_0_100%)] group-data-[state=reset]:[clip-path:inset(0_100%_0_0)] group-data-[state=in]:transition-[clip-path] group-data-[state=out]:transition-[clip-path] group-data-[state=in]:duration-[400ms] group-data-[state=out]:duration-[400ms] group-data-[state=in]:ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=out]:ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=reset]:transition-none" data-nav-clip-fill="" data-nav-label="" aria-hidden="true">
                  {"Product"}
                </span>
              </a>
            </li>
            <li>
              <a href="/#services" className="group relative hidden md:inline-flex" data-nav-clip="">
                <span data-nav-label="">
                  {"Add-on"}
                </span>
                <span className="absolute inset-0 flex items-center bg-white text-black pointer-events-none whitespace-nowrap [clip-path:inset(0_100%_0_0)] group-data-[state=in]:[clip-path:inset(0_0_0_0)] group-data-[state=out]:[clip-path:inset(0_0_0_100%)] group-data-[state=reset]:[clip-path:inset(0_100%_0_0)] group-data-[state=in]:transition-[clip-path] group-data-[state=out]:transition-[clip-path] group-data-[state=in]:duration-[400ms] group-data-[state=out]:duration-[400ms] group-data-[state=in]:ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=out]:ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=reset]:transition-none" data-nav-clip-fill="" data-nav-label="" aria-hidden="true">
                  {"Add-on"}
                </span>
              </a>
            </li>
          </ul>
          <a href="/#about" className="group relative hidden md:inline-flex md:col-span-3 lg:col-span-1 uppercase justify-self-start self-center" data-nav-clip="">
            <span data-nav-label="">
              {"Why"}
            </span>
            <span className="absolute inset-0 flex items-center bg-white text-black pointer-events-none whitespace-nowrap [clip-path:inset(0_100%_0_0)] group-data-[state=in]:[clip-path:inset(0_0_0_0)] group-data-[state=out]:[clip-path:inset(0_0_0_100%)] group-data-[state=reset]:[clip-path:inset(0_100%_0_0)] group-data-[state=in]:transition-[clip-path] group-data-[state=out]:transition-[clip-path] group-data-[state=in]:duration-[400ms] group-data-[state=out]:duration-[400ms] group-data-[state=in]:ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=out]:ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=reset]:transition-none" data-nav-clip-fill="" data-nav-label="" aria-hidden="true">
              {"Why"}
            </span>
          </a>
          <div className="md:col-span-2 lg:col-span-2 flex items-center justify-end gap-3">
            <a href="/report" className="group relative overflow-visible font-sans leading-none inline-grid" style={{"color": "black"}} data-track-cta="header" data-track-label="Try the demo" data-astro-cid-ekguhzzh="">
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "maskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <div className="absolute inset-0 rounded transition-[inset] duration-600 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover:inset-[0.125em]" style={{"backgroundColor": "white"}} data-astro-cid-ekguhzzh="" />
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(0.65px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "maskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <div className="absolute inset-0 rounded transition-[inset] duration-600 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover:inset-[0.125em]" style={{"backgroundColor": "white"}} data-astro-cid-ekguhzzh="" />
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(2px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "maskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <div className="absolute inset-0 rounded transition-[inset] duration-600 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover:inset-[0.125em]" style={{"backgroundColor": "white"}} data-astro-cid-ekguhzzh="" />
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "maskImage": "linear-gradient(to bottom, black 0%, black 22%, transparent 58%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <span data-button-animate-chars="" className="relative z-1 inline-block overflow-hidden whitespace-nowrap text-base leading-[1.3] font-medium" style={{"color": "black"}} data-astro-cid-ekguhzzh="">
                    {"Try the demo →"}
                  </span>
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(0.65px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "maskImage": "linear-gradient(to bottom, transparent 15%, black 32%, black 58%, transparent 78%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <span data-button-animate-chars="" className="relative z-1 inline-block overflow-hidden whitespace-nowrap text-base leading-[1.3] font-medium" style={{"color": "black"}} data-astro-cid-ekguhzzh="">
                    {"Try the demo →"}
                  </span>
                </span>
              </span>
              <span className="button-blur-layer col-start-1 row-start-1 p-4 -m-4 pointer-events-none" style={{"filter": "blur(2px)", "WebkitMaskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "maskImage": "linear-gradient(to bottom, transparent 42%, black 65%, black 100%)", "WebkitMaskSize": "100% 100%", "maskSize": "100% 100%", "WebkitMaskRepeat": "no-repeat", "maskRepeat": "no-repeat"}} aria-hidden="true" data-astro-cid-ekguhzzh="">
                <span className="relative flex items-center rounded h-8 px-3" data-astro-cid-ekguhzzh="">
                  <span data-button-animate-chars="" className="relative z-1 inline-block overflow-hidden whitespace-nowrap text-base leading-[1.3] font-medium" style={{"color": "black"}} data-astro-cid-ekguhzzh="">
                    {"Try the demo →"}
                  </span>
                </span>
              </span>
            </a>
            <button type="button" className="inline-flex shrink-0 justify-start whitespace-nowrap uppercase md:hidden" data-mobile-menu-toggle="" aria-expanded="false" aria-controls="mobile-menu">
              <span data-mobile-menu-toggle-label="">
                {"Menu"}
              </span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
