import { getLt } from "@/components/lt";
export default async function Showcase() {
  const lt = await getLt();
  return (
    <>
      <section id="background-container" className="flex justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div data-pixelate-render="" data-pixelate-render-trigger="inview" data-pixelate-render-keep="" data-pixelate-render-hover="" data-pixelate-render-duration="80" data-pixelate-render-steps="8" data-background-pixelate="" className="pixelated-render-image h-full w-full">
            <img src="/media/showcase-1.webp" alt={lt("A forest stream over mossy rocks")} data-pixelate-render-img="" data-background-img="0" aria-hidden="false" loading="lazy" decoding="async" width="1500" height="1983" className="pixelated-render-image__img" />
            <img src="/media/showcase-2.webp" alt={lt("A waterfall in a dark forest")} data-background-img="1" aria-hidden="true" loading="lazy" decoding="async" width="1500" height="1983" className="pixelated-render-image__img opacity-0" />
          </div>
        </div>
        <svg className="relative z-1 pointer-events-none" viewBox="0 0 1106 1394" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* StreamProof mark: a drop with a check */}
          <path d="M553 40C553 40 123 560 123 880A430 430 0 0 0 983 880C983 560 553 40 553 40Z" stroke="white" strokeWidth="2" />
          <path d="M370 890L505 1025L760 760" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </section>
    </>
  );
}
