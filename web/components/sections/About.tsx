export default function About() {
  return (
    <>
      <section id="about" data-intro-sequence="" className="page-x pt-3 md:pt-5 border-t border-neutral-200 pb-32 md:pb-64">
        <div className="grid grid-cols-4 lg:grid-cols-12 gap-x-3 lg:gap-5 mb-6 lg:mb-12">
          <div data-section-heading="" className="flex items-center self-start" style={{"color": "black"}}>
            <span className="inline-grid shrink-0 overflow-visible align-middle h-4 w-4 mr-1" style={{"color": "black"}}>
              <span className="col-start-1 row-start-1 p-1 -m-1" style={{"filter": "blur(1px)", "WebkitMaskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)", "maskImage": "linear-gradient(to right, white 0%, white 25%, transparent 55%)"}}>
                <span data-badge-number="" className="flex items-center justify-center rounded-full border-current text-center leading-none h-4 w-4 border text-[0.625rem]">
                  {"5"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0.5px)", "WebkitMaskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)", "maskImage": "linear-gradient(to right, transparent 20%, white 40%, white 60%, transparent 80%)"}} aria-hidden="true">
                <span data-badge-number="" className="flex items-center justify-center rounded-full border-current text-center leading-none h-4 w-4 border text-[0.625rem]">
                  {"5"}
                </span>
              </span>
              <span className="col-start-1 row-start-1 p-1 -m-1 pointer-events-none" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)", "maskImage": "linear-gradient(to right, transparent 50%, white 75%, white 100%)"}} aria-hidden="true">
                <span data-badge-number="" className="flex items-center justify-center rounded-full border-current text-center leading-none h-4 w-4 border text-[0.625rem]">
                  {"5"}
                </span>
              </span>
            </span>
            <h2 data-section-heading-label="" className="font-mono uppercase leading-none">
              {"(Why)"}
            </h2>
            <div className="relative inline-grid overflow-visible" style={{"WebkitMaskImage": "linear-gradient(to right, black 0%, black 35%, transparent 85%)", "maskImage": "linear-gradient(to right, black 0%, black 35%, transparent 85%)"}} aria-hidden="true">
              <span data-section-heading-label="" className="col-start-1 row-start-1 font-mono uppercase leading-none p-1 -m-1 -scale-x-100" style={{"filter": "blur(1px)", "WebkitMaskImage": "linear-gradient(to right, black 0%, black 25%, transparent 55%)", "maskImage": "linear-gradient(to right, black 0%, black 25%, transparent 55%)"}}>
                {"(Why)"}
              </span>
              <span data-section-heading-label="" className="col-start-1 row-start-1 font-mono uppercase leading-none p-1 -m-1 -scale-x-100 pointer-events-none" style={{"filter": "blur(0.5px)", "WebkitMaskImage": "linear-gradient(to right, transparent 20%, black 40%, black 60%, transparent 80%)", "maskImage": "linear-gradient(to right, transparent 20%, black 40%, black 60%, transparent 80%)"}}>
                {"(Why)"}
              </span>
              <span data-section-heading-label="" className="col-start-1 row-start-1 font-mono uppercase leading-none p-1 -m-1 -scale-x-100 pointer-events-none" style={{"filter": "blur(0px)", "WebkitMaskImage": "linear-gradient(to right, transparent 50%, black 75%, black 100%)", "maskImage": "linear-gradient(to right, transparent 50%, black 75%, black 100%)"}}>
                {"(Why)"}
              </span>
            </div>
          </div>
          <p data-scramble-mono="" className="col-start-3 lg:col-start-5 col-span-2 font-mono uppercase leading-none text-right lg:text-left">
            {"(EST.2026)"}
          </p>
          <p data-intro-text="" className="col-span-4 lg:col-span-6 text-[1.563rem] md:text-[2.5rem] leading-[1.2] md:leading-12 tracking-[-0.01em] mt-4.5 lg:-mt-2 pr-8 font-medium opacity-0 data-intro-ready:opacity-100">
            {"A rumour and a verified report look the same to a computer. StreamProof tells them apart inside OneAquaHealth’s own FHIR standard, so cities can act on what citizens see."}
          </p>
        </div>
        <div className="grid grid-cols-4 lg:grid-cols-12 gap-x-3 lg:gap-5">
          <div className="col-span-2 mb-12 lg:mb-0">
            <div data-pixelate-render="" data-pixelate-render-trigger="inview" data-pixelate-render-hover="" className="pixelated-render-image w-full rounded-xs">
              <div className="pixelated-render-image__before is--portrait" />
              <img src="/_astro/2.yw5_OBiP_Z1rTg71.webp" data-pixelate-render-img="true" alt="Team photo (placeholder)" loading="lazy" decoding="async" width="227" height="302" className="pixelated-render-image__img" />
            </div>
            <div className="flex justify-between items-center text-[#767676] pt-2">
              <p>
                {"The team"}
              </p>
              <p>
                {"(Track 7)"}
              </p>
            </div>
          </div>
          <div className="lg:col-start-5 col-span-4 lg:col-span-8">
            <p data-intro-text="" className="text-[1.563rem] md:text-[2.5rem] leading-[1.2] md:leading-12 tracking-[-0.01em] -mt-2 mb-6.5 md:mb-12 pr-8 font-medium opacity-0 data-intro-ready:opacity-100">
              {"Trust in citizen-science data is an old problem. Alabri & Hunter (IEEE e-Science 2010) combined quality checks with trust metrics, and Baker et al. (2021) reviewed 259 schemes and recommended layered verification. StreamProof implements that and adds a machine-readable rule for what each trust level may be used for, carried inside standard FHIR records."}
            </p>
            <p data-intro-text="" className="text-[1.563rem] md:text-[2.5rem] leading-[1.2] md:leading-12 tracking-[-0.01em] -mt-2 pr-8 font-medium opacity-0 data-intro-ready:opacity-100">
              {"It is designed for OneAquaHealth’s five cities (Benevento, Coimbra, Ghent, Oslo and Toulouse) and to outlive the project: the add-on is proposed as a module for the HL7 Europe OAH guide, and the rule files stay open."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
