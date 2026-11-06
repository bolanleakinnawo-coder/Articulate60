const User = require("../MODELS/User");
const { isValidTimeZone, safeZone } = require("./streak");

// The app sends the device's IANA time zone in the X-Time-Zone header.
function timeZoneFromRequest(req) {
  const zone = req.get("x-time-zone") || req.body?.timeZone;
  return isValidTimeZone(zone) ? zone : null;
}

// Returns the zone to use for this member, saving the device's zone when
// it is new or has changed (e.g. they travelled).
async function resolveTimeZone(req, user) {
  const fromDevice = timeZoneFromRequest(req);
  if (fromDevice && user && user.timeZone !== fromDevice) {
    await User.updateOne({ _id: user._id }, { $set: { timeZone: fromDevice } });
    user.timeZone = fromDevice;
  }
  return safeZone(fromDevice || user?.timeZone);
}

module.exports = { timeZoneFromRequest, resolveTimeZone };
