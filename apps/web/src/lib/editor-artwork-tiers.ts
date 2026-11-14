export type ArtworkTierSide = "Front Mockup" | "Back Mockup";

export const LARGE_ARTWORK_EDGE_PX = 3500;
export const SMALL_ARTWORK_EDGE_PX = 1500;

export function getArtworkMaxEdgePx(
  side: ArtworkTierSide,
  largeTierOwner: ArtworkTierSide | null,
): number {
  return largeTierOwner === null || largeTierOwner === side
    ? LARGE_ARTWORK_EDGE_PX
    : SMALL_ARTWORK_EDGE_PX;
}

export function claimLargeArtworkTier(
  _currentOwner: ArtworkTierSide | null,
  claimant: ArtworkTierSide,
): ArtworkTierSide {
  return claimant;
}

export function reconcileLargeArtworkTier(
  currentOwner: ArtworkTierSide | null,
  side: ArtworkTierSide,
  displayedLongestEdgePx: number,
): ArtworkTierSide | null {
  if (displayedLongestEdgePx > SMALL_ARTWORK_EDGE_PX) {
    return currentOwner ?? side;
  }
  return currentOwner === side ? null : currentOwner;
}

export function releaseLargeArtworkTier(
  currentOwner: ArtworkTierSide | null,
  removedSide: ArtworkTierSide,
): ArtworkTierSide | null {
  return currentOwner === removedSide ? null : currentOwner;
}
