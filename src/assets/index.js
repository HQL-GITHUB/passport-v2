import atlas from './collectible-atlas.webp';
import hero from './museum-courtyard.webp';
import heroThumb from './museum-courtyard-thumb.webp';
import porcelainBadge from './badge-porcelain.webp';
import maritimeBadge from './badge-maritime.webp';
import textileBadge from './badge-textile.webp';
import astronomyBadge from './badge-astronomy.webp';
import porcelainVenue from './venue-porcelain.webp';
import maritimeVenue from './venue-maritime.webp';
import textileVenue from './venue-textile.webp';
import astronomyVenue from './venue-astronomy.webp';
import porcelainThumb from './venue-porcelain-thumb.webp';
import maritimeThumb from './venue-maritime-thumb.webp';
import textileThumb from './venue-textile-thumb.webp';
import astronomyThumb from './venue-astronomy-thumb.webp';

// Every image here is derived from the PNG original of the same name by
// scripts/optimize-images.py.
export const assets = {
  atlas,
  // Stamps drawn after the atlas each have an image of their own, keyed by the stamp's `art`.
  badges: {
    porcelain: porcelainBadge,
    maritime: maritimeBadge,
    textile: textileBadge,
    astronomy: astronomyBadge,
  },
  // The photograph of a venue, keyed by its id. A venue without one shows its stamp as a poster.
  venues: {
    museum: hero,
    porcelain: porcelainVenue,
    maritime: maritimeVenue,
    textile: textileVenue,
    astronomy: astronomyVenue,
  },
  // The same photographs at the size of a destination card.
  venueThumbs: {
    museum: heroThumb,
    porcelain: porcelainThumb,
    maritime: maritimeThumb,
    textile: textileThumb,
    astronomy: astronomyThumb,
  },
};
