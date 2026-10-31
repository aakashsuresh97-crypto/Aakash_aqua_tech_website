const crypto = require('crypto');

// Any RFC 4122 style UUID: 8-4-4-4-12 hex digits (accepts v1 ... v8, upper or lower case).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/** Lower-cases a valid UUID so lookups are consistent; returns null when the value is not a UUID. */
const normalizeUuid = (value) => (isUuid(value) ? value.toLowerCase() : null);

/** New random (version 4) UUID, e.g. 36a8b30f-e1bc-4118-918d-b7834393e55f */
const newUuid = () => crypto.randomUUID();

module.exports = { UUID_RE, isUuid, normalizeUuid, newUuid };
