export interface VentureForm {
  name: string;
  description: string;
  stage: string;
  location: string;
  needs: string[];
  offers: string[];
  tech_stack: string[];
  target_market: string[];
  contact_email: string;
  bin_number: string;
}

export interface DbTags {
  needs: string[];
  offers: string[];
  tech_stack: string[];
  target_market: string[];
}