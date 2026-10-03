export default function PageBackground() {
  return (
    <>
      <div className="page-bg" aria-hidden="true" />
      {/* Fixed WebGL above .page-bg, below content (z-index: -1) */}
      <canvas id="dla-bg" data-cell-size="7" data-seeds="9" data-base-opacity="0.4" data-spot-radius="0.1" data-fr="0.95" data-fg="0.95" data-fb="0.95" data-er="0.75" data-eg="0.75" data-eb="0.75" data-hfr="0.95" data-hfg="0.95" data-hfb="0.95" data-her="0.5" data-heg="0.5" data-heb="0.5" data-border-px="1" data-astro-cid-x7nsh3bp="" />
    </>
  );
}
