import { getLt } from "@/components/lt";
export default async function Testimonials() {
  const lt = await getLt();
  return (
    <>
      <section id="testimonials" className="relative h-screen flex flex-col justify-between overflow-hidden page-x pt-3 pb-6 md:py-5 md:pb-8 z-2" data-testimonials="">
        <div className="absolute inset-0">
          <div data-pixelate-render="" data-pixelate-render-trigger="inview" data-pixelate-render-keep="" data-pixelate-render-hover="" data-pixelate-render-duration="80" data-pixelate-render-steps="8" data-testimonial-pixelate="bg" className="pixelated-render-image h-full w-full">
            <img src="/media/serves-1.webp" alt="" data-pixelate-render-img="" data-testimonial-bg="0" aria-hidden="true" loading="lazy" decoding="async" width="1500" height="1000" className="pixelated-render-image__img" />
            <img src="/media/serves-2.webp" alt="" data-testimonial-bg="1" aria-hidden="true" loading="lazy" decoding="async" width="1500" height="1000" className="pixelated-render-image__img opacity-0" />
            <img src="/media/serves-3.webp" alt="" data-testimonial-bg="2" aria-hidden="true" loading="lazy" decoding="async" width="1500" height="1000" className="pixelated-render-image__img opacity-0" />
          </div>
        </div>
        <div className="absolute inset-0 bg-black opacity-50 pointer-events-none" />
        <div className="relative z-10 w-full pointer-events-none">
          <div data-section-heading="" className="flex items-center" style={{"color": "white"}}>
            <span className="inline-grid shrink-0 overflow-visible align-middle h-4 w-4 mr-1" style={{"color": "white"}}>
              <span className="col-start-1 row-start-1 p-1 -m-1" style={{"filter": "blur(1px)", "WebkitMaskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)", "maskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)"}}>
                <span data-badge-number="" className="flex items-center justify-center rounded-full border-current text-center leading-none h-4 w-4 border text-[0.625rem]">
                  {"4"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0.5px)", "WebkitMaskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)", "maskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)"}} aria-hidden="true">
                <span data-badge-number="" className="flex items-center justify-center rounded-full border-current text-center leading-none h-4 w-4 border text-[0.625rem]">
                  {"4"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)", "maskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)"}} aria-hidden="true">
                <span data-badge-number="" className="flex items-center justify-center rounded-full border-current text-center leading-none h-4 w-4 border text-[0.625rem]">
                  {"4"}
                </span>
              </span>
            </span>
            <h2 data-section-heading-label="" className="font-mono uppercase leading-none">
              {lt("(Who it serves)")}
            </h2>
            <div className="relative inline-grid overflow-visible" style={{"WebkitMaskImage": "linear-gradient(to right, black 0%, black 35%, transparent 85%)", "maskImage": "linear-gradient(to right, black 0%, black 35%, transparent 85%)"}} aria-hidden="true">
              <span data-section-heading-label="" className="col-start-1 row-start-1 font-mono uppercase leading-none p-1 -m-1 -scale-x-100" style={{"filter": "blur(1px)", "WebkitMaskImage": "linear-gradient(to right, black 0%, black 25%, transparent 55%)", "maskImage": "linear-gradient(to right, black 0%, black 25%, transparent 55%)"}}>
                {lt("(Who it serves)")}
              </span>
              <span data-section-heading-label="" className="col-start-1 row-start-1 font-mono uppercase leading-none p-1 -m-1 -scale-x-100 pointer-events-none" style={{"filter": "blur(0.5px)", "WebkitMaskImage": "linear-gradient(to right, transparent 20%, black 40%, black 60%, transparent 80%)", "maskImage": "linear-gradient(to right, transparent 20%, black 40%, black 60%, transparent 80%)"}}>
                {lt("(Who it serves)")}
              </span>
              <span data-section-heading-label="" className="col-start-1 row-start-1 font-mono uppercase leading-none p-1 -m-1 -scale-x-100 pointer-events-none" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to right, transparent 50%, black 75%, black 100%)", "maskImage": "linear-gradient(to right, transparent 50%, black 75%, black 100%)"}}>
                {lt("(Who it serves)")}
              </span>
            </div>
          </div>
          <div className="inline-grid overflow-visible counter-vertical-right">
            <div className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)", "maskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)"}} aria-hidden="true">
              <div className="border rounded-full px-1.5 pb-px h-4 flex items-center text-white border-white">
                <span className="text-[0.625rem] leading-none font-normal">
                  <span data-counter-current="">
                    {"1"}
                  </span>
                  {" — 3"}
                </span>
              </div>
            </div>
            <div className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0.5px)", "WebkitMaskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)", "maskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)"}} aria-hidden="true">
              <div className="border rounded-full px-1.5 pb-px h-4 flex items-center text-white border-white">
                <span className="text-[0.625rem] leading-none font-normal">
                  <span data-counter-current="">
                    {"1"}
                  </span>
                  {" — 3"}
                </span>
              </div>
            </div>
            <div className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(1px)", "WebkitMaskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)", "maskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)"}} aria-hidden="true">
              <div className="border rounded-full px-1.5 pb-px h-4 flex items-center text-white border-white">
                <span className="text-[0.625rem] leading-none font-normal">
                  <span data-counter-current="">
                    {"1"}
                  </span>
                  {" — 3"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-4 md:grid-cols-12 gap-3 md:gap-5 pointer-events-none">
          <div className="col-span-4 md:col-span-12 lg:col-span-6">
            <div className="relative">
              <div className="relative opacity-100" data-testimonial-slide="0" data-testimonial-person={lt("Citizens and schools")} data-testimonial-org={lt("Report · track · certificate")} aria-hidden="false">
                <p data-intro-text="" className="text-[1.563rem] md:text-[2.5rem] leading-[1.2] md:leading-12 tracking-[-0.01em] font-medium text-white pb-4 md:pb-5 opacity-0 data-intro-ready:opacity-100">
                  {lt("See in plain words why a report got its grade and what would make it stronger. An all-clear counts as much as a problem, and every contributor gets a signed record.")}
                </p>
              </div>
              <div className="absolute inset-0 opacity-0 pointer-events-none" data-testimonial-slide="1" data-testimonial-person={lt("OAH partner ecologists")} data-testimonial-org={lt("Verify · missions")} aria-hidden="true">
                <p data-intro-text="" className="text-[1.563rem] md:text-[2.5rem] leading-[1.2] md:leading-12 tracking-[-0.01em] font-medium text-white pb-4 md:pb-5 opacity-0 data-intro-ready:opacity-100">
                  {lt("Review only the reports that are flagged, with the nearby evidence beside each one, and send a mission upstream when the proof is thin.")}
                </p>
              </div>
              <div className="absolute inset-0 opacity-0 pointer-events-none" data-testimonial-slide="2" data-testimonial-person={lt("Municipalities")} data-testimonial-org={lt("River Health Brief")} aria-hidden="true">
                <p data-intro-text="" className="text-[1.563rem] md:text-[2.5rem] leading-[1.2] md:leading-12 tracking-[-0.01em] font-medium text-white pb-4 md:pb-5 opacity-0 data-intro-ready:opacity-100">
                  {lt("Get a River Health Brief with measures matched from the OAH Catalogue, advisory flags only at decision grade, and under-observed reaches marked so every neighbourhood counts. Health units and DipteraCAST receive only what the published rules permit.")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0">
                <div data-pixelate-render="" data-testimonial-pixelate="avatar" data-pixelate-render-trigger="inview" data-pixelate-render-keep="" data-pixelate-render-duration="80" data-pixelate-render-steps="8" className="pixelated-render-image h-full rounded-full">
                  <img src="/media/serves-1-sm.webp" alt={lt("Citizens and schools")} data-pixelate-render-img="" data-testimonial-avatar="0" aria-hidden="false" loading="lazy" decoding="async" width="36" height="36" className="pixelated-render-image__img rounded-full" />
                  <img src="/media/serves-2-sm.webp" alt={lt("OAH partner ecologists")} data-testimonial-avatar="1" aria-hidden="true" loading="lazy" decoding="async" width="36" height="36" className="pixelated-render-image__img rounded-full opacity-0" />
                  <img src="/media/serves-3-sm.webp" alt={lt("Municipalities")} data-testimonial-avatar="2" aria-hidden="true" loading="lazy" decoding="async" width="36" height="36" className="pixelated-render-image__img rounded-full opacity-0" />
                </div>
              </div>
              <div className="text-white text-xs">
                <p data-testimonial-name="" className="min-h-[1em] opacity-0">
                  {lt("Citizens and schools")}
                </p>
                <p data-testimonial-company="" className="min-h-[1em] opacity-0">
                  {lt("Report · track · certificate")}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 flex items-center gap-2">
            <button type="button" className="pointer-events-auto relative inline-grid h-9 w-9 shrink-0 overflow-visible rotate-180 cursor-pointer group" data-testimonial-prev="" aria-label={lt("Previous")}>
              <span className="col-start-1 row-start-1 p-1 -m-1" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)", "maskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)"}}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white text-xl pb-0.5 transition-colors duration-150 ease-[ease] group-hover:bg-white group-hover:text-black">
                  {"→"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0.5px)", "WebkitMaskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)", "maskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)"}} aria-hidden="true">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white text-xl pb-0.5 transition-colors duration-150 ease-[ease] group-hover:bg-white group-hover:text-black">
                  {"→"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(1px)", "WebkitMaskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)", "maskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)"}} aria-hidden="true">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white text-xl pb-0.5 transition-colors duration-150 ease-[ease] group-hover:bg-white group-hover:text-black">
                  {"→"}
                </span>
              </span>
            </button>
            <button type="button" className="pointer-events-auto relative inline-grid h-9 w-9 shrink-0 overflow-visible cursor-pointer group" data-testimonial-next="" aria-label={lt("Next")}>
              <span className="col-start-1 row-start-1 p-1 -m-1" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)", "maskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)"}}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white text-xl pb-0.5 transition-colors duration-150 ease-[ease] group-hover:bg-white group-hover:text-black">
                  {"→"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0.5px)", "WebkitMaskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)", "maskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)"}} aria-hidden="true">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white text-xl pb-0.5 transition-colors duration-150 ease-[ease] group-hover:bg-white group-hover:text-black">
                  {"→"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(1px)", "WebkitMaskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)", "maskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)"}} aria-hidden="true">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white text-xl pb-0.5 transition-colors duration-150 ease-[ease] group-hover:bg-white group-hover:text-black">
                  {"→"}
                </span>
              </span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
