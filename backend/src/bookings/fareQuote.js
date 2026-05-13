const BASE_FARE_SEN = 2500;
const DISTANCE_PLACEHOLDER_SEN = 1000;
const CHAPERONE_ADJUSTMENT_SEN = 1500;

const SERVICE_TYPE_ADJUSTMENTS_SEN = Object.freeze({
  medical_appointment: 2000,
  hospital_discharge: 3000,
  physiotherapy: 1500,
  dialysis: 2500,
  general_assistance: 1000,
});

function calculateMvpFareQuote({ serviceType, needsChaperone }) {
  const serviceAdjustment = SERVICE_TYPE_ADJUSTMENTS_SEN[serviceType] || 1000;
  const chaperoneAdjustment = needsChaperone ? CHAPERONE_ADJUSTMENT_SEN : 0;

  return {
    amountSen:
      BASE_FARE_SEN + DISTANCE_PLACEHOLDER_SEN + serviceAdjustment + chaperoneAdjustment,
    currency: "MYR",
    breakdown: {
      baseFareSen: BASE_FARE_SEN,
      distancePlaceholderSen: DISTANCE_PLACEHOLDER_SEN,
      serviceTypeAdjustmentSen: serviceAdjustment,
      chaperoneAdjustmentSen: chaperoneAdjustment,
    },
    note: "MVP quote logic only. Distance uses a placeholder until map/distance API integration is added.",
  };
}

module.exports = { calculateMvpFareQuote };
