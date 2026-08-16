import { APIError } from '../middleware/errorHandler.js';

/**
 * Resolve Location + Bin (TrayMaster) for auto-inward from a PO receipt.
 * Destination LocationTray is not used here — inventory stays on a Bin.
 */
export async function resolveAutoInwardLocationAndBin(tx, preferredGodown) {
  let location = await tx.locationMaster.findFirst({
    where: { deleteStatus: false, godownType: preferredGodown },
  });
  if (!location) {
    location = await tx.locationMaster.findFirst({
      where: { deleteStatus: false },
    });
  }

  let tray = location
    ? await tx.trayMaster.findFirst({
        where: { location_id: location.id, deleteStatus: false },
      })
    : null;

  if (!tray) {
    tray = await tx.trayMaster.findFirst({
      where: { deleteStatus: false },
    });
    if (tray?.location_id) {
      const trayLocation = await tx.locationMaster.findFirst({
        where: { id: tray.location_id, deleteStatus: false },
      });
      if (trayLocation) location = trayLocation;
    }
  }

  if (!location) {
    throw new APIError('No location found for auto-inward', 400, 'NO_LOCATION_FOUND');
  }

  return { location, tray };
}
