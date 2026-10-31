import { BRAND_LOGOS } from '../lib.js';

/* brand name with its small logo (when a logo file is registered in lib.js) */
export default function BrandMark({ brand, className = '' }) {
  const logo = BRAND_LOGOS[brand];
  return <span className={'brm ' + className}>{logo && <img src={logo} alt="" height="20" loading="lazy" decoding="async" draggable={false} />}<span>{brand}</span></span>;
}
