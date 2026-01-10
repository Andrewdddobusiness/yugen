// Builder bootstrap is now itinerary-wide (activities/slots span all destinations),
// so cache invalidations must fan out across destination routes.
export const builderBootstrapTag = (_userId: string, itineraryId: string, _destinationId: string) =>
  `builderBootstrap:${itineraryId}`;
