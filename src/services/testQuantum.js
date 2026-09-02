// Path: src/services/testQuantum.js
import { QuantumResistantShield } from './cryptoShield.js';

const mockLedger = {
  workerId: "worker-kor-8821",
  totalEmployerLiability: 3163208.33,
  cumulativeSeveranceLiability: 4996577.69
};

console.log("==================================================");
console.log("   CAREBRIDGE QUANTUM-RESISTANT AUDIT SHIELD TEST ");
console.log("==================================================");

const auditToken = QuantumResistantShield.generateAuditToken(mockLedger);
console.log(`Algorithm: ${auditToken.algorithm}`);
console.log(`Security vs. Grover's Algorithm: ${auditToken.securityBitsVsGrover} bits of effective security`);
console.log(`Generated Cryptographic Hash:\n  ${auditToken.quantumReadyHash}`);

const isValid = QuantumResistantShield.verifyToken(mockLedger, auditToken.quantumReadyHash);
console.log("--------------------------------------------------");
console.log(`MOEL Audit Verification Result: ${isValid ? 'VERIFIED (Immutable & Quantum-Proof)' : 'FAILED'}`);
console.log("==================================================");
