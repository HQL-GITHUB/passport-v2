import atlas from '../assets/collectible-atlas.png';
import hero from '../assets/museum-courtyard.png';
import porcelainBadge from '../assets/badge-porcelain.png';
import maritimeBadge from '../assets/badge-maritime.png';
import textileBadge from '../assets/badge-textile.png';
import astronomyBadge from '../assets/badge-astronomy.png';
import porcelainVenue from '../assets/venue-porcelain.png';
import maritimeVenue from '../assets/venue-maritime.png';
import textileVenue from '../assets/venue-textile.png';
import astronomyVenue from '../assets/venue-astronomy.png';

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
};
