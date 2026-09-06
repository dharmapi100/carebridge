// Path: src/services/visaValidator.js
// NOTE: this validator performs a LOCAL allowlist check only. It has no
// network call, no integration with Hi-Korea, the Ministry of Justice, or
// any government system -- it never has. It checks a caller-supplied visa
// type string against CareBridge's own list of visa categories understood
// to permit elder-care work. It is NOT a substitute for official immigration
// verification. All response text below must make this explicit -- do not
// reintroduce language implying a government-system check occurred.
export class VisaValidator {
  constructor() {
    // Visa categories understood to permit elder-care/caregiving work in
    // South Korea. F-2 (Resident), F-4 (Overseas Korean), F-5 (Permanent
    // Resident), F-6 (Marriage), H-2 (Working Visit), E-9 (Non-Professional
    // Employment). E-7-2 added per confirmed 2026 expansion allowing foreign
    // students who complete 요양보호사 (certified care worker) training to
    // work under E-7-2 (특정활동) -- source: 요양보호사 자격 관련 안내
    // (naver blog citing the visa-category expansion), cross-checked against
    // the pre-expansion baseline list this array previously matched exactly.
    // 'E-9-Care' as a distinct subcategory is NOT included -- as of this
    // writing it could not be confirmed against a primary government source;
    // MOEL discussion of expanding E-9 into caregiving was found, but no
    // codified 'E-9-Care' category. Do not add it without a primary-source
    // confirmation (e.g. moel.go.kr or an official Ministry notice).
    this.ALLOWED_CARE_VISAS = ['F-2', 'F-4', 'F-5', 'F-6', 'H-2', 'E-9', 'E-7-2'];
  }

  validateVisaStatus(applicantData) {
    const { nationality, visaType, alienRegistrationNumber, isEmployedLegal } = applicantData;

    if (!nationality || !visaType || !alienRegistrationNumber) {
      return {
        eligible: false,
        reason: 'Missing required fields for CareBridge visa-category check (Nationality, Visa Type, or ARC).'
      };
    }

    const isAllowed = this.ALLOWED_CARE_VISAS.includes(visaType.toUpperCase());
    
    if (!isAllowed) {
      return {
        eligible: false,
        visaType,
        reason: `Visa type '${visaType}' is not on CareBridge's approved caregiver visa category list. This is not an official immigration determination.`
      };
    }

    return {
      eligible: true,
      visaType: visaType.toUpperCase(),
      nationality,
      message: "Visa type matches CareBridge's approved caregiver category list -- not a substitute for official immigration verification."
    };
  }
}
