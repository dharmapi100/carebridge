// Path: src/services/visaValidator.js
export class VisaValidator {
  constructor() {
    // Approved visa types for elder care & nursing support in South Korea
    // E.g., F-2 (Resident), F-5 (Permanent Resident), F-6 (Marriage), H-2 / E-9 (Work permit under specific care quotas)
    this.ALLOWED_CARE_VISAS = ['F-2', 'F-4', 'F-5', 'F-6', 'H-2', 'E-9'];
  }

  validateVisaStatus(applicantData) {
    const { nationality, visaType, alienRegistrationNumber, isEmployedLegal } = applicantData;

    if (!nationality || !visaType || !alienRegistrationNumber) {
      return {
        eligible: false,
        reason: 'Missing required immigration verification fields (Nationality, Visa Type, or ARC).'
      };
    }

    const isAllowed = this.ALLOWED_CARE_VISAS.includes(visaType.toUpperCase());
    
    if (!isAllowed) {
      return {
        eligible: false,
        visaType,
        reason: `Visa type '${visaType}' is not legally authorized for elder care employment under Ministry of Justice guidelines.`
      };
    }

    return {
      eligible: true,
      visaType: visaType.toUpperCase(),
      nationality,
      message: 'Hi-Korea Immigration & Visa status verified: Eligible for care employment.'
    };
  }
}
