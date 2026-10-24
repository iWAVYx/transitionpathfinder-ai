/** Featured placement is independent of verification. Retain legacy featured listings. */
export function isFeaturedPartner(partner: {
  is_featured: boolean;
  verification_status: string;
}): boolean {
  return partner.is_featured || partner.verification_status === "featured";
}
