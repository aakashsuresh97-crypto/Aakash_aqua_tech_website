import kent from './assets/brands/kent.png'
import aosmith from './assets/brands/aosmith.png'
import aquaguard from './assets/brands/aquaguard.png'
import lexpure from './assets/brands/lexpure.png'
import faber from './assets/brands/faber.png'
import c100 from './assets/brands/c100.png'
import enviro from './assets/brands/enviro.png'
import misty from './assets/brands/misty.png'
import olivar from './assets/brands/olivar.png'
import sarwans from './assets/brands/sarwans.png'

// add / remove / reorder brands here (put the logo file in src/assets/brands/)
const LOGOS = [
  ['Kent', kent],
  ['AO Smith', aosmith],
  ['Aquaguard', aquaguard],
  ['Lexpure', lexpure],
  ['Faber', faber],
  ['100°C', c100],
  ['Enviro', enviro],
  ['Misty', misty],
  ['Olyar', olivar],
  ['Sarwans', sarwans],
]

export default function Brands() {
  return (
    <section className="bm" aria-label="Brands we service and support">
      <h2 className="bm-h rv">
        Brands We <em>Service &amp; Support</em>
      </h2>
      <p className="bm-sub rv">
        Authorized multi-brand sales, genuine manufacturer spare parts, and certified technician support across Tamil
        Nadu.
      </p>

      <div className="bm-view">
        <div className="bm-track">
          {/* list is repeated twice so the loop is seamless */}
          {[...LOGOS, ...LOGOS].map(([name, src], i) => (
            <figure className="bm-item" key={i} aria-hidden={i >= LOGOS.length}>
              <div className="bm-card">
                <div className="bm-logo">
                  <img src={src} alt={name} loading="lazy" draggable="false" />
                </div>
              </div>
              <figcaption>{name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
