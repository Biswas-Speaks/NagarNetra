import { randomInt } from "node:crypto";

// Crockford-style alphabet: no I, L, O, U, 0, 1 to avoid misreads over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateTicketCode(cityCode: string, length = 4): string {
  let suffix = "";
  for (let i = 0; i < length; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `NN-${cityCode.toUpperCase()}-${suffix}`;
}

export const TICKET_PATTERN = /^NN-[A-Z]{2,5}-[0-9A-Z]{4,6}$/;
