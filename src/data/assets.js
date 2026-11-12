import atlas from '../assets/collectible-atlas.webp';
import hero from '../assets/museum-courtyard.webp';
import heroThumb from '../assets/museum-courtyard-thumb.webp';
import porcelainBadge from '../assets/badge-porcelain.webp';
import maritimeBadge from '../assets/badge-maritime.webp';
import textileBadge from '../assets/badge-textile.webp';
import astronomyBadge from '../assets/badge-astronomy.webp';
import porcelainVenue from '../assets/venue-porcelain.webp';
import maritimeVenue from '../assets/venue-maritime.webp';
import textileVenue from '../assets/venue-textile.webp';
import astronomyVenue from '../assets/venue-astronomy.webp';
import porcelainThumb from '../assets/venue-porcelain-thumb.webp';
import maritimeThumb from '../assets/venue-maritime-thumb.webp';
import textileThumb from '../assets/venue-textile-thumb.webp';
import astronomyThumb from '../assets/venue-astronomy-thumb.webp';

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
